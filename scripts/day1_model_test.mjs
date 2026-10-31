// Day-1 model test: confirms the real API shape for Muse Spark (image + structured
// output) and SAM 3.1 (segmentation) on staged photos in scripts/test_photos/.
//
//   cd scripts && npm install && npm run day1            (all photos)
//   LIMIT=3 npm run day1                                  (first 3 photos)
//
// Privacy: never logs image bytes, GPS or EXIF values; only booleans and counts.
// Results go to scripts/out/ (gitignored).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import exifr from "exifr";
import { z } from "zod";
import { parseImageStream, recordsOfKind } from "@meta-sam/parser";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PHOTO_DIR = path.join(HERE, "test_photos");
const OUT_DIR = path.join(HERE, "out");
const SPARK = "muse-spark-1.3"; // standard mode only; never a -contributor model
const SAM = "sam-3.1";
const SAM_PROMPTS_PER_PHOTO = 3;
const LIMIT = Number(process.env.LIMIT) || Infinity;

if (!process.env.MODEL_API_KEY) {
  console.error("MODEL_API_KEY is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
if (/contributor/i.test(SPARK)) throw new Error("contributor models are not allowed");

const client = new OpenAI({
  baseURL: process.env.MODEL_BASE_URL || "https://api.meta.ai/v1",
  apiKey: process.env.MODEL_API_KEY,
});

// --- Spark structured output -------------------------------------------------

const ItemSchema = z.object({
  category: z.string(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  condition: z.enum(["good", "worn", "damaged", "unknown"]),
  confidence: z.number().min(0).max(1),
  evidence: z.enum(["seen_in_photo", "inferred"]),
});
const PhotoSchema = z.object({
  photo_kind: z.enum(["room_or_belongings", "id_or_document", "screenshot", "other"]),
  items: z.array(ItemSchema),
});

const nullableString = { type: ["string", "null"] };
const PHOTO_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["photo_kind", "items"],
  properties: {
    photo_kind: { type: "string", enum: ["room_or_belongings", "id_or_document", "screenshot", "other"] },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "brand", "model", "condition", "confidence", "evidence"],
        properties: {
          category: { type: "string", description: "short lowercase noun usable as a segmentation prompt, e.g. 'sofa'" },
          brand: { ...nullableString, description: "only if a logo or label is legible; else null" },
          model: { ...nullableString, description: "only if legible or unmistakable; else null" },
          condition: { type: "string", enum: ["good", "worn", "damaged", "unknown"] },
          confidence: { type: "number", description: "0 to 1" },
          evidence: { type: "string", enum: ["seen_in_photo", "inferred"] },
        },
      },
    },
  },
};

const IDENTIFY_PROMPT = `You help a disaster survivor rebuild a home-contents inventory for an insurance claim.
First classify the photo. If it shows an ID card, passport, document, receipt-like paper, or is a screenshot, set photo_kind accordingly and return an empty items list.
Otherwise list distinct household belongings worth claiming (furniture, electronics, appliances, decor, clothing, tools). Skip walls, floors, windows, people and pets.
Never guess a brand or model you cannot read; use null. Be conservative: do not inflate.`;

async function identify(dataUrl) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const t0 = Date.now();
    const res = await client.responses.create({
      model: SPARK,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: IDENTIFY_PROMPT },
          { type: "input_image", image_url: dataUrl },
        ],
      }],
      text: { format: { type: "json_schema", name: "photo_items", schema: PHOTO_JSON_SCHEMA, strict: true } },
    });
    const ms = Date.now() - t0;
    try {
      return { ok: true, ms, attempt, usage: res.usage, model: res.model, data: PhotoSchema.parse(JSON.parse(res.output_text)) };
    } catch (err) {
      if (attempt === 2) return { ok: false, ms, attempt, usage: res.usage, error: `validation: ${err.message.slice(0, 300)}` };
    }
  }
}

// --- SAM 3.1 -------------------------------------------------------------------

let samImageMode = null; // "data_url" | "file_id", learned on first success

async function segmentOnce(prompt, imagePart) {
  const stream = await client.responses.create({
    model: SAM,
    input: [{ type: "message", role: "user", content: [{ type: "input_text", text: prompt }, imagePart] }],
    stream: true,
  });
  const result = await parseImageStream(stream).finalResult;
  const boxes = recordsOfKind(result.records, "box");
  const masks = recordsOfKind(result.records, "mask");
  return {
    status: result.outcome.status,
    instances: boxes.length,
    masks: masks.length,
    boxes: boxes.map((b) => ({ id: b.objectId, l: b.left, t: b.top, r: b.right, b: b.bottom, c: b.confidence ?? null })),
    diagnostics: result.diagnostics.map((d) => `${d.severity}:${d.code}`),
  };
}

async function segment(prompt, file, dataUrl) {
  const t0 = Date.now();
  if (samImageMode !== "file_id") {
    try {
      const r = await segmentOnce(prompt, { type: "input_image", image_url: dataUrl });
      samImageMode = "data_url";
      return { prompt, mode: "data_url", ms: Date.now() - t0, ...r };
    } catch (err) {
      if (samImageMode === "data_url") return { prompt, mode: "data_url", ms: Date.now() - t0, error: errText(err) };
      console.warn(`  SAM rejected data URL (${errText(err)}); trying Files API`);
    }
  }
  // Fallback: upload via Files API, segment by file_id, delete immediately.
  let uploaded;
  try {
    uploaded = await client.files.create({ file: fs.createReadStream(file), purpose: "user_data" });
    const r = await segmentOnce(prompt, { type: "input_image", file_id: uploaded.id });
    samImageMode = "file_id";
    return { prompt, mode: "file_id", ms: Date.now() - t0, ...r };
  } catch (err) {
    return { prompt, mode: "file_id", ms: Date.now() - t0, error: errText(err) };
  } finally {
    if (uploaded) await client.files.delete(uploaded.id).catch(() => {});
  }
}

// --- helpers -------------------------------------------------------------------

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function errText(err) {
  return `${err?.status ?? ""} ${err?.message ?? err}`.trim().slice(0, 300);
}

async function exifSummary(file) {
  try {
    const e = await exifr.parse(file, { gps: true, pick: ["DateTimeOriginal", "latitude", "longitude"] });
    return { has_date: !!e?.DateTimeOriginal, has_gps: e?.latitude != null };
  } catch {
    return { has_date: false, has_gps: false };
  }
}

// --- main ----------------------------------------------------------------------

async function smokeTest() {
  const t0 = Date.now();
  const res = await client.responses.create({ model: SPARK, input: "Reply with the single word: ready" });
  console.log(`Smoke test: model=${res.model} reply=${JSON.stringify(res.output_text)} ${Date.now() - t0}ms usage=${JSON.stringify(res.usage)}`);
}

async function main() {
  await smokeTest();

  const photos = fs.readdirSync(PHOTO_DIR)
    .filter((f) => MIME[path.extname(f).toLowerCase()])
    .slice(0, LIMIT);
  if (photos.length === 0) {
    console.log(`No photos in ${PHOTO_DIR}. Add staged .jpg/.png/.webp photos and rerun.`);
    return;
  }

  const results = [];
  for (const [i, name] of photos.entries()) {
    const file = path.join(PHOTO_DIR, name);
    const ext = path.extname(name).toLowerCase();
    const dataUrl = `data:${MIME[ext]};base64,${fs.readFileSync(file).toString("base64")}`;
    const photoId = `photo_${String(i + 1).padStart(2, "0")}`;
    console.log(`\n[${i + 1}/${photos.length}] ${photoId} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB)`);

    const exif = await exifSummary(file);
    const ident = await identify(dataUrl).catch((err) => ({ ok: false, error: errText(err) }));
    const row = { photo_id: photoId, exif, identify: ident, sam: [] };

    if (!ident.ok) {
      console.log(`  Spark FAILED: ${ident.error}`);
    } else {
      const { photo_kind, items } = ident.data;
      console.log(`  Spark ${ident.ms}ms attempt=${ident.attempt} kind=${photo_kind} items=${items.length}: ${items.map((x) => x.category).join(", ")}`);
      if (photo_kind === "room_or_belongings") {
        const prompts = [...new Set(items.map((x) => x.category.toLowerCase()))].slice(0, SAM_PROMPTS_PER_PHOTO);
        for (const prompt of prompts) {
          const s = await segment(prompt, file, dataUrl);
          row.sam.push(s);
          console.log(s.error
            ? `  SAM "${prompt}" FAILED (${s.mode}): ${s.error}`
            : `  SAM "${prompt}" ${s.ms}ms mode=${s.mode} instances=${s.instances} status=${s.status}${s.diagnostics.length ? " diag=" + s.diagnostics.join(",") : ""}`);
        }
      } else {
        console.log("  auto-skipped (not a belongings photo)");
      }
    }
    results.push(row);
  }

  // Summary
  const okIdent = results.filter((r) => r.identify.ok);
  const samCalls = results.flatMap((r) => r.sam);
  const samOk = samCalls.filter((s) => !s.error);
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const summary = {
    photos: results.length,
    spark_ok: okIdent.length,
    spark_retries: okIdent.filter((r) => r.identify.attempt === 2).length,
    spark_avg_ms: avg(okIdent.map((r) => r.identify.ms)),
    spark_input_tokens: okIdent.reduce((a, r) => a + (r.identify.usage?.input_tokens ?? 0), 0),
    spark_output_tokens: okIdent.reduce((a, r) => a + (r.identify.usage?.output_tokens ?? 0), 0),
    items_found: okIdent.reduce((a, r) => a + r.identify.data.items.length, 0),
    auto_skipped: okIdent.filter((r) => r.identify.data.photo_kind !== "room_or_belongings").length,
    sam_calls: samCalls.length,
    sam_ok: samOk.length,
    sam_image_mode: samImageMode,
    sam_avg_ms: avg(samOk.map((s) => s.ms)),
    sam_zero_instance_prompts: samOk.filter((s) => s.instances === 0).length,
    photos_with_exif_date: results.filter((r) => r.exif.has_date).length,
    photos_with_gps: results.filter((r) => r.exif.has_gps).length,
  };
  console.log("\n=== SUMMARY ===");
  console.table(summary);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, `day1_results_${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ summary, results }, null, 2));
  console.log(`Details: ${outFile}`);
}

main().catch((err) => {
  console.error("FATAL:", errText(err));
  process.exit(1);
});

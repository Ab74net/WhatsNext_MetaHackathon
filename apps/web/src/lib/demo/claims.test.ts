import assert from "node:assert/strict";
import { test } from "node:test";
import { demoScanClient, restoreDemoClaim } from "./claims.ts";
import { sampleCsv, samplePdf, sampleXlsx } from "./exports.ts";
import { SAMPLE_PHOTOS, SAMPLE_SETS, sampleEstimate } from "./samples.ts";

test("fixture boxes stay within each sample photo and use the inventory schema", () => {
  assert.equal(SAMPLE_SETS.length, 3);
  for (const photo of SAMPLE_PHOTOS) for (const item of photo.items) {
    assert.equal(item.user_confirmed, false);
    assert.equal(item.estimated_replacement_usd, null);
    const b = item.photos[0].mask!.bounds;
    assert.ok(b.left >= 0 && b.top >= 0 && b.right <= photo.width && b.bottom <= photo.height && b.left < b.right && b.top < b.bottom, item.id);
  }
});
test("real file contents are rejected and confirmation/merge/split remain local", async () => {
  const { session_id: id } = await demoScanClient.createSession();
  await assert.rejects(demoScanClient.uploadPhoto(id, new File(["private"], "living-room.webp")), /personal files/);
  await assert.rejects(demoScanClient.uploadPhoto(id, new File([], "unknown.webp")), /supplied sample/);
  for (const pid of ["living-room", "living-detail"]) {
    await demoScanClient.uploadPhoto(id, new File([], `${pid}.webp`));
    await demoScanClient.extract(id, pid);
  }
  const merged = await demoScanClient.autoMerge(id);
  const table = merged.items.find(i => i.category === "coffee table")!;
  assert.equal(table.photos.length, 2);
  assert.equal(table.user_confirmed, false);
  await demoScanClient.patchItem(id, table.id, { user_confirmed: true });
  const parts = await demoScanClient.splitItem(id, table.id);
  assert.equal(parts.length, 2);
  assert.ok(parts.every(i => i.user_confirmed));
  await demoScanClient.deleteItem(id, parts[0].id);
  assert.ok(!restoreDemoClaim()!.items[parts[0].id]);
  const sofa = merged.items.find(i => i.category === "sofa")!;
  const pillow = merged.items.find(i => i.category === "pillow")!;
  await demoScanClient.mergeItems(id, [sofa.id, pillow.id]);
  await demoScanClient.mergeItems(id, [sofa.id, parts[1].id]);
  const leaves = await demoScanClient.splitItem(id, sofa.id);
  assert.deepEqual(new Set(leaves.map(i => i.id)), new Set([sofa.id, pillow.id, parts[1].id]));
  await demoScanClient.endSession(id);
  assert.equal(restoreDemoClaim(), null);
});
test("exports filter unconfirmed items, mark every PDF page, and escape spreadsheet formulas", () => {
  const item = structuredClone(SAMPLE_PHOTOS[0].items[0]);
  const hidden = { ...item, id: "hidden", category: "DO_NOT_EXPORT", user_confirmed: false };
  item.user_confirmed = true; item.category = "=HYPERLINK(example)"; item.estimated_replacement_usd = sampleEstimate("sofa");
  const csv = sampleCsv([item, hidden]);
  assert.match(csv, /"'=HYPERLINK/); assert.doesNotMatch(csv, /DO_NOT_EXPORT/); assert.match(csv, /SAMPLE, concept demo/);
  const many = Array.from({ length: 12 }, (_, i) => ({ ...item, id: String(i) }));
  const pdf = new TextDecoder().decode(samplePdf(many));
  assert.equal((pdf.match(/SAMPLE, concept demo/g) || []).length, 6);
  assert.match(pdf, /\/Count 3/); assert.doesNotMatch(pdf, /DO_NOT_EXPORT/);
  const xlsx = new TextDecoder().decode(sampleXlsx([item, hidden]));
  assert.match(xlsx, /t="inlineStr"/); assert.match(xlsx, /oddHeader/); assert.match(xlsx, /oddFooter/); assert.doesNotMatch(xlsx, /DO_NOT_EXPORT|<f>/);
});

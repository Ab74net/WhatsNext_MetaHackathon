import brand from "../../../../../packages/shared/brand.json" with { type: "json" };
import type { InventoryItem } from "@shared/types";
import type { ExportFormat } from "../adapters/contracts";
import { samplePhoto } from "./samples.ts";

const LABEL = "SAMPLE, concept demo";
const encoder = new TextEncoder();
const bytes = (text: string) => encoder.encode(text);
function join(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}
function confirmed(items: InventoryItem[]) { return items.filter(i => i.user_confirmed).sort((a, b) => a.category.localeCompare(b.category)); }
function totals(items: InventoryItem[]) {
  return items.reduce((sum, i) => ({ low: sum.low + (i.estimated_replacement_usd?.low || 0), high: sum.high + (i.estimated_replacement_usd?.high || 0), priced: sum.priced + Number(!!i.estimated_replacement_usd) }), { low: 0, high: 0, priced: 0 });
}
function csvCell(value: unknown) {
  const text = String(value ?? "");
  // Stop spreadsheet formula interpretation of edited item labels.
  return '"' + (/^\s*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
}
export function sampleCsv(items: InventoryItem[]) {
  const list = confirmed(items), sum = totals(list);
  const rows: unknown[][] = [[LABEL], [brand.projectName, "Illustrative inventory. Not a real claim or proof of ownership."],
    ["Item", "Brand", "Model", "Condition", "Sample views", "Sample estimate low USD", "Sample estimate high USD", "Price source"],
    ...list.map(i => [i.category, i.brand, i.model, i.condition, i.photos.map(p => p.photo_id).join("; "), i.estimated_replacement_usd?.low ?? "", i.estimated_replacement_usd?.high ?? "", "Sample data, no source"]),
    ["Confirmed sample items", list.length], ["Sample totals USD", sum.low, sum.high, `${sum.priced} of ${list.length} items priced`], [LABEL]];
  return rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
const xml = (value: unknown) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

// Minimal standards-based ZIP container (stored entries, no dependency or external service).
function zip(files: Record<string, string>) {
  const local: Uint8Array[] = [], directory: Uint8Array[] = [];
  let offset = 0;
  function crc32(data: Uint8Array) { let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
  for (const [name, text] of Object.entries(files)) {
    const file = bytes(text), filename = bytes(name), crc = crc32(file);
    const header = new Uint8Array(30), h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(12, 33, true); h.setUint32(14, crc, true); h.setUint32(18, file.length, true); h.setUint32(22, file.length, true); h.setUint16(26, filename.length, true);
    const central = new Uint8Array(46), c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(14, 33, true); c.setUint32(16, crc, true); c.setUint32(20, file.length, true); c.setUint32(24, file.length, true); c.setUint16(28, filename.length, true); c.setUint32(42, offset, true);
    local.push(header, filename, file); directory.push(central, filename); offset += header.length + filename.length + file.length;
  }
  const central = join(directory), end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, Object.keys(files).length, true); e.setUint16(10, Object.keys(files).length, true); e.setUint32(12, central.length, true); e.setUint32(16, offset, true);
  return join([...local, central, end]);
}
export function sampleXlsx(items: InventoryItem[]) {
  const list = confirmed(items), sum = totals(list);
  const rows: unknown[][] = [[LABEL], [brand.projectName, "Not a real claim. Sample estimates, no source."],
    ["Item", "Brand", "Model", "Condition", "Sample views", "Sample estimate low USD", "Sample estimate high USD"],
    ...list.map(i => [i.category, i.brand || "", i.model || "", i.condition, i.photos.length, i.estimated_replacement_usd?.low ?? "", i.estimated_replacement_usd?.high ?? ""]),
    ["Confirmed sample items", list.length], ["Sample totals USD", "", "", "", "", sum.low, sum.high], [LABEL]];
  const sheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, index) => `<row r="${index + 1}">${row.map((value, col) => `<c r="${String.fromCharCode(65 + col)}${index + 1}" ${typeof value === "number" ? `t="n"><v>${value}</v>` : `t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is>`}</c>`).join("")}</row>`).join("")}</sheetData><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddHeader>&amp;C${LABEL}</oddHeader><oddFooter>&amp;C${LABEL} · &amp;P / &amp;N</oddFooter></headerFooter></worksheet>`;
  return zip({
    "[Content_Types].xml": '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sample inventory" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": sheet,
  });
}

interface Jpeg { data: Uint8Array; width: number; height: number }
function pdfText(text: string) { return text.normalize("NFKD").replace(/[^\x20-\x7e]/g, "?").replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"); }
export function samplePdf(items: InventoryItem[], images: Record<string, Jpeg> = {}) {
  const list = confirmed(items), sum = totals(list), objects: Uint8Array[] = [bytes(""), bytes("")];
  const add = (data: string | Uint8Array) => { objects.push(typeof data === "string" ? bytes(data) : data); return objects.length; };
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pages: number[] = [];
  for (let offset = 0; offset < Math.max(1, list.length); offset += 5) {
    let content = "";
    const line = (text: string, x: number, y: number, size = 10) => { content += `BT /F1 ${size} Tf ${x} ${y} Td (${pdfText(text)}) Tj ET\n`; };
    line(LABEL, 40, 805, 14); line(`${brand.projectName} - sample inventory`, 40, 782, 16);
    line(`${list.length} confirmed sample items | ${sum.priced} priced | Sample total: $${sum.low} - $${sum.high}`, 40, 760);
    line("Not a real claim, appraisal, or proof of ownership. Sample data, no source.", 40, 743, 9);
    const imageRefs: string[] = [];
    list.slice(offset, offset + 5).forEach((item, index) => {
      const y = 705 - index * 125, pid = item.photos[0]?.photo_id, image = images[pid];
      if (image) {
        const object = add(join([bytes(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`), image.data, bytes("\nendstream")]));
        const name = `Im${index}`; imageRefs.push(`/${name} ${object} 0 R`);
        const scale = Math.min(100 / image.width, 85 / image.height), w = image.width * scale, h = image.height * scale;
        content += `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} 40 ${(y - h).toFixed(2)} cm /${name} Do Q\n`;
      }
      const title = `${offset + index + 1}. ${item.category}`;
      line(title.slice(0, 66), 155, y, 12);
      if (title.length > 66) line(title.slice(66, 132), 155, y - 15, 10);
      line(`Condition: ${item.condition} | ${item.photos.length} sample view(s)`, 155, y - 33);
      line(`Brand / model: ${[item.brand, item.model].filter(Boolean).join(" ").slice(0, 55) || "Not specified"}`, 155, y - 49);
      line(item.estimated_replacement_usd ? `Sample estimate: $${item.estimated_replacement_usd.low} - $${item.estimated_replacement_usd.high}` : "Sample estimate: not supplied", 155, y - 65);
      line(`Sample photo: ${pid || "None"}`, 155, y - 81, 9);
    });
    line(`${LABEL} | Page ${pages.length + 1} / ${Math.max(1, Math.ceil(list.length / 5))}`, 40, 30, 10);
    const stream = bytes(content), streamId = add(join([bytes(`<< /Length ${stream.length} >>\nstream\n`), stream, bytes("endstream")]));
    pages.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> /XObject << ${imageRefs.join(" ")} >> >> /Contents ${streamId} 0 R >>`));
  }
  objects[0] = bytes("<< /Type /Catalog /Pages 2 0 R >>");
  objects[1] = bytes(`<< /Type /Pages /Kids [${pages.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  const chunks = [bytes("%PDF-1.4\n")], offsets = [0]; let length = chunks[0].length;
  objects.forEach((object, index) => { offsets.push(length); const chunk = join([bytes(`${index + 1} 0 obj\n`), object, bytes("\nendobj\n")]); chunks.push(chunk); length += chunk.length; });
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`;
  return join([...chunks, bytes(xref)]);
}
async function jpeg(photoId: string): Promise<Jpeg> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("The sample photo could not be loaded for the PDF.")); image.src = samplePhoto(photoId).src; });
  const canvas = document.createElement("canvas"), scale = Math.min(1, 240 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d"); if (!context) throw new Error("PDF image preparation is unavailable in this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const binary = atob(canvas.toDataURL("image/jpeg", .8).split(",")[1]);
  return { data: Uint8Array.from(binary, c => c.charCodeAt(0)), width: canvas.width, height: canvas.height };
}
export async function downloadClaim(items: InventoryItem[], format: ExportFormat) {
  const list = confirmed(items); if (!list.length) throw new Error("Confirm at least one sample item before exporting.");
  let data: string | Uint8Array;
  if (format === "pdf") {
    const ids = [...new Set(list.flatMap(i => i.photos.slice(0, 1).map(p => p.photo_id)))];
    data = samplePdf(list, Object.fromEntries(await Promise.all(ids.map(async id => [id, await jpeg(id)] as const))));
  } else data = format === "xlsx" ? sampleXlsx(list) : sampleCsv(list);
  const mime = { pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv;charset=utf-8" };
  const url = URL.createObjectURL(new Blob([typeof data === "string" ? data : new Uint8Array(data).buffer], { type: mime[format] }));
  const a = document.createElement("a"); a.href = url; a.download = `SAMPLE-concept-inventory.${format}`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

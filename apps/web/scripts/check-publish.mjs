// A read-only final check after setting the real domain and rebuilding.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_MODE, DEMO_VIDEO_URL, SITE_URL } from "../src/lib/demo/config.ts";
import { normalizeSiteOrigin, PUBLIC_PAGES, SOCIAL_IMAGE } from "../src/lib/site.ts";

const root = path.resolve(fileURLToPath(new URL("../out/", import.meta.url)));
const errors = [];
let origin = "";
try { origin = normalizeSiteOrigin(SITE_URL); } catch (e) { errors.push(e.message); }
if (!origin && !errors.length) errors.push("Set SITE_URL in apps/web/src/lib/demo/config.ts to your final HTTPS domain, then rebuild. No domain has been configured yet.");
if (DEMO_MODE !== true) errors.push("The public build must remain in demo mode.");
if (!fs.existsSync(path.join(root, "index.html"))) errors.push("Run npm run build before checking publication.");

function attr(tag, name) { return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]; }
if (origin && fs.existsSync(root)) {
  for (const page of PUBLIC_PAGES) {
    const file = path.join(root, page.path, "index.html");
    if (!fs.existsSync(file)) { errors.push(`Missing exported page: ${page.path}`); continue; }
    const html = fs.readFileSync(file, "utf8");
    const tags = html.match(/<(?:meta|link)\b[^>]*>/g) || [];
    const canonical = tags.find(tag => attr(tag, "rel") === "canonical");
    const meta = property => tags.find(tag => attr(tag, "property") === property || attr(tag, "name") === property);
    const expected = new URL(page.path, origin).href;
    if (!canonical || attr(canonical, "href") !== expected) errors.push(`${page.path}: canonical URL is missing/stale. Rebuild after setting SITE_URL.`);
    if (attr(meta("og:url") || "", "content") !== expected) errors.push(`${page.path}: social URL does not match its canonical.`);
    for (const property of ["og:image", "twitter:image"]) if (attr(meta(property) || "", "content") !== new URL(SOCIAL_IMAGE, origin).href) errors.push(`${page.path}: ${property} must point to the local social card on the final domain.`);
  }
  const sitemapFile = path.join(root, "sitemap.xml"), robotsFile = path.join(root, "robots.txt");
  const sitemap = fs.existsSync(sitemapFile) ? fs.readFileSync(sitemapFile, "utf8") : "";
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  if (locations.length !== PUBLIC_PAGES.length || PUBLIC_PAGES.some(page => !locations.includes(new URL(page.path, origin).href))) errors.push("The sitemap must list every public page on the configured domain. Rebuild it.");
  if (!fs.existsSync(robotsFile) || !fs.readFileSync(robotsFile, "utf8").includes(`Sitemap: ${new URL("/sitemap.xml", origin).href}`)) errors.push("robots.txt does not reference the final sitemap.");
}
const imagePath = path.join(root, SOCIAL_IMAGE);
if (fs.existsSync(imagePath)) {
  const png = fs.readFileSync(imagePath);
  if (png.length < 24 || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) errors.push("Social card must be a valid 1200 x 630 PNG.");
} else errors.push("The generated social card is missing. Rebuild the site.");
if (DEMO_VIDEO_URL) {
  try { const video = new URL(DEMO_VIDEO_URL); if (video.protocol !== "https:" || video.username || video.password) throw new Error(); }
  catch { errors.push("DEMO_VIDEO_URL must be an HTTPS link without embedded credentials, or left blank."); }
} else console.log("Optional: the demo video link is still empty.");
if (errors.length) {
  console.error("Publication check needs attention:\n" + errors.map(error => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Publication metadata passed for ${PUBLIC_PAGES.length} pages on ${origin}.`);
  console.log("Review IMAGE_CREDITS.md for publication permissions separately. This check does not deploy anything.");
}

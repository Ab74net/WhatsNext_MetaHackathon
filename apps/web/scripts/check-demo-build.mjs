import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CSP, DEMO_MODE } from "../src/lib/demo/config.ts";

const root = fileURLToPath(new URL("../out/", import.meta.url));
const banned = /MODEL_API_KEY|WREN_API_KEY|SAM_API_KEY|ELEVENLABS_API_KEY|MODEL_BASE_URL|api\.meta\.ai|api\.openai\.com|api\.elevenlabs\.io|api\.weather\.gov|server\.arcgisonline\.com|navigator\s*\.\s*(?:geolocation|mediaDevices)|getUserMedia|MediaRecorder|type\s*[:=]\s*["']file["']|\.sendBeacon\s*\(|\/api\/(?:agent|sessions|health|toolkit)/i;
const violations = [];
let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:js|mjs|html|json|txt|map)$/.test(entry.name)) {
      count++;
      const text = fs.readFileSync(file, "utf8");
      const match = text.match(banned);
      if (match) violations.push(`${path.relative(root, file)}: ${match[0]}`);
      if (entry.name.endsWith(".html") && text.includes("unsafe-eval")) violations.push(`${path.relative(root, file)}: development CSP in public export`);
      if (entry.name.endsWith(".html") && !text.includes("connect-src &#x27;self&#x27;") && !text.includes("connect-src 'self'")) violations.push(`${path.relative(root, file)}: missing CSP`);
    }
  }
}
if (!fs.existsSync(root)) throw new Error("Build the static site first.");
if (DEMO_MODE !== true) throw new Error("The public site must use demo mode.");
const vercel = JSON.parse(fs.readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8"));
const web = vercel.services?.web;
if (Object.keys(vercel.services ?? {}).join() !== "web" || web.root !== "apps/web" || web.framework !== "nextjs" || web.outputDirectory !== "out" || web.bindings?.length || web.functions) {
  throw new Error("The public deployment must contain only the static web service, without backend bindings or functions.");
}
const serviceBuildKeys = ["framework", "functions", "installCommand", "buildCommand", "devCommand", "ignoreCommand", "outputDirectory"];
if (serviceBuildKeys.some(key => key in vercel)) throw new Error("Vercel Services build settings must live inside services.web.");
if (vercel.rewrites?.length !== 1 || vercel.rewrites[0].source !== "/(.*)" || vercel.rewrites[0].destination?.service !== "web" || vercel.trailingSlash !== true) {
  throw new Error("Public routes must target the static web service and preserve trailing slashes.");
}
const vercelCsp = vercel.headers?.find(rule => rule.source === "/(.*)")?.headers.find(header => header.key.toLowerCase() === "content-security-policy")?.value;
if (vercelCsp !== `${CSP}; frame-ancestors 'none'`) throw new Error("Vercel CSP must match the shared demo policy.");
walk(root);
if (violations.length) throw new Error("Demo firewall failed:\n" + violations.join("\n"));
console.log(`Demo firewall passed: ${count} static files; no live clients, upload inputs, or secret names.`);

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../out/", import.meta.url));
const banned = /MODEL_API_KEY|WREN_API_KEY|SAM_API_KEY|ELEVENLABS_API_KEY|MODEL_BASE_URL|api\.meta\.ai|api\.openai\.com|api\.elevenlabs\.io|api\.weather\.gov|server\.arcgisonline\.com|navigator\s*\.\s*(?:geolocation|mediaDevices)|getUserMedia|MediaRecorder|type\s*=\s*["']file["']|\.sendBeacon\s*\(|\/api\/(?:agent|sessions|health|toolkit)/i;
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
      if (entry.name.endsWith(".html") && !text.includes("connect-src &#x27;self&#x27;") && !text.includes("connect-src 'self'")) violations.push(`${path.relative(root, file)}: missing CSP`);
    }
  }
}
if (!fs.existsSync(root)) throw new Error("Build the static site first.");
walk(root);
if (violations.length) throw new Error("Demo firewall failed:\n" + violations.join("\n"));
console.log(`Demo firewall passed: ${count} static files; no live clients, upload inputs, or secret names.`);

// Clear generated artifacts before each export, including Windows/OneDrive stale entries.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeSocialCard } from "./make-social-card.mjs";
const app = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
for (const name of [".next", "out"]) {
  const target = path.resolve(app, name);
  if (path.dirname(target) !== app || ![".next", "out"].includes(path.basename(target))) throw new Error("Refusing unexpected build cleanup path.");
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}
// Netlify/Cloudflare use this optional header file; the meta CSP protects every host.
const config = fs.readFileSync(path.join(app, "src/lib/demo/config.ts"), "utf8");
const csp = config.match(/export const CSP = "([^"]+)"/)[1];
fs.writeFileSync(path.join(app, "public/_headers"), `/*\n  Content-Security-Policy: ${csp}; frame-ancestors 'none'\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`);
fs.writeFileSync(path.join(app, "public/.nojekyll"), "");
await makeSocialCard();

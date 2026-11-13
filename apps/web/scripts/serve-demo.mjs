// Small local static preview, also used by the browser network test. No API routes.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../out/", import.meta.url));
const port = Number(process.argv[2] || 3000);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".txt": "text/plain", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".xml": "application/xml" };
http.createServer((req, res) => {
  let filename;
  try { filename = path.resolve(root, "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (!filename.startsWith(root + path.sep) && filename !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) filename = path.join(filename, "index.html");
  let status = 200;
  if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) { filename = path.join(root, "404.html"); status = 404; }
  if (!fs.existsSync(filename)) { res.writeHead(404).end("Build the demo first."); return; }
  res.writeHead(status, { "Content-Type": mime[path.extname(filename)] || "application/octet-stream", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" });
  fs.createReadStream(filename).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`Static demo: http://127.0.0.1:${port}`));

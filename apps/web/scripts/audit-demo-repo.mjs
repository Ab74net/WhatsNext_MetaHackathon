// Read-only audit. Prints locations/categories, never secret values or image bytes.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const repo = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const git = (args, input, binary = false) => execFileSync("git", args, { cwd: repo, input, encoding: binary ? undefined : "utf8", maxBuffer: 256 * 1024 * 1024, windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
const lines = value => value.trim().split(/\r?\n/).filter(Boolean);
const objectPaths = new Map(lines(git(["rev-list", "--objects", "--all"])).map(row => { const i = row.indexOf(" "); return i < 0 ? [row, ""] : [row.slice(0, i), row.slice(i + 1)]; }));
const metadata = lines(git(["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"], [...objectPaths.keys()].join("\n") + "\n"));
const blobs = metadata.map(row => row.split(" ")).filter(([, type]) => type === "blob");
const localValues = [], localEnv = [];
for (const name of [".env", "apps/api/.env", "apps/web/.env", "apps/web/.env.local"]) {
  const file = path.join(repo, name); if (!fs.existsSync(file)) continue;
  let ignored = false; try { ignored = !!git(["check-ignore", name]).trim(); } catch {}
  const keys = [];
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/); if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    const populated = !!value && !value.startsWith("#"); keys.push({ name: match[1], populated });
    if (populated && /KEY|TOKEN|SECRET|PASSWORD/.test(match[1]) && value.length >= 12) localValues.push({ key: match[1], value });
  }
  localEnv.push({ file: name, ignored, keys });
}
const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/g],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["API credential candidate", /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/g],
  ["literal credential candidate", /(?:api[_-]?key|access[_-]?token|secret[_-]?key|password)\s*[=:]\s*["'][A-Za-z0-9_+\/-]{24,}["']/gi],
  ["environment credential candidate", /(?:MODEL_API_KEY|WREN_API_KEY|SAM_API_KEY|ELEVENLABS_API_KEY|OPENAI_API_KEY)[ \t]*=[ \t]*["']?[A-Za-z0-9_+\/-]{24,}/g],
];
const findings = [];
// Bounded batches also scan binary blobs for known credential strings.
for (let start = 0; start < blobs.length; start += 40) {
  const group = blobs.slice(start, start + 40), raw = git(["cat-file", "--batch"], group.map(([id]) => id).join("\n") + "\n", true);
  let offset = 0;
  for (const [id] of group) {
    const end = raw.indexOf(10, offset), header = raw.subarray(offset, end).toString("utf8"), size = Number(header.split(" ")[2]);
    const content = raw.subarray(end + 1, end + 1 + size).toString("utf8"); offset = end + size + 2;
    for (const [kind, pattern] of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) findings.push({ object: id, path: objectPaths.get(id), kind });
    }
    for (const { key, value } of localValues) if (content.includes(value)) findings.push({ object: id, path: objectPaths.get(id), kind: `Exact match to local ${key} (value redacted)` });
  }
}
const historyPaths = lines(git(["log", "--all", "--pretty=format:", "--name-only"]));
const photoPaths = [...new Set(historyPaths.filter(p => /\.(jpg|jpeg|png|webp|avif|heic|heif)$/i.test(p)))].sort();
const envPaths = [...new Set(historyPaths.filter(p => /(^|\/)(\.env(?:\..*)?|[^/]+\.(pem|key|p12|pfx))$/i.test(p)))].sort();
const example = fs.readFileSync(path.join(repo, ".env.example"), "utf8");
const populatedExampleKeys = example.split(/\r?\n/).map(line => line.match(/^[ \t]*([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD))[ \t]*=[ \t]*(.*)$/)).filter(m => m && m[2].trim() && !m[2].trim().startsWith("#")).map(m => m[1]);
const report = { scope: "All reachable commits on all local/remote branches; current ignored env files checked locally, values never printed", blobsScanned: blobs.length, findings, localEnv, envPathsInHistory: envPaths, populatedExampleKeys, imagePathsInHistory: photoPaths, rawPhotoPathsInHistory: photoPaths.filter(p => !p.startsWith("apps/web/public/") && !p.startsWith("docs/") && p !== "apps/web/src/app/icon.png") };
const output = path.join(repo, "scripts/out/demo-audit"); fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(output, "repo-audit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (findings.length || populatedExampleKeys.length || report.rawPhotoPathsInHistory.length) process.exitCode = 1;

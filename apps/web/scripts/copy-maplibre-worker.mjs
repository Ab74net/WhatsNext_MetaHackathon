// MapLibre loads its web worker from a separate file next to its own script, which the
// bundler moves. Serve the worker as a static file instead (MapPanel calls setWorkerUrl).
// Runs before `dev` and `build` so the copy always matches the installed version.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = path.dirname(require.resolve("maplibre-gl/package.json"));
const publicDir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "public");
mkdirSync(publicDir, { recursive: true });
copyFileSync(path.join(pkgDir, "dist", "maplibre-gl-worker.mjs"), path.join(publicDir, "maplibre-gl-worker.mjs"));

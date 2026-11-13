# Public concept demo

The public frontend builds to `apps/web/out` with no environment variables or runtime server. Do not deploy FastAPI for this version.

`apps/web/src/lib/api.ts` exports only the demo adapter. Its small `AgentClient`, `ScanClient`, and `ToolkitClient` contracts live in `lib/adapters/contracts.ts`. The original API client is retained in `lib/adapters/real.ts` and is never imported by the public entry point. Original model and image processing code remains in `apps/api`.

`lib/demo/config.ts` holds the hard-on `DEMO_MODE` constant, public link placeholders, and CSP. The CSP is emitted near the start of every page's head: `connect-src 'self'`, no frames, no workers, no external scripts, fonts, or images. The local map is an original schematic with fictional places; it uses no tile service. External official-source links open only when clicked, with no referrer.

`npm --prefix apps/web run build` produces the static export and automatically runs `scripts/check-demo-build.mjs`. The check rejects live API hostnames, secret variable names, upload inputs, permission calls, and missing CSP in the built files. System fonts remove the old Google Fonts build dependency.

The persistent concept banner explains the simulation. Reset demo clears only this app's browser keys and reloads to clear in-memory state. No analytics, account, server storage, or paid service is used.

## Baseline before conversion

At `f0ac7c6`, 37 frontend and 109 API tests passed; the production build passed. Twelve desktop/mobile route checks passed without uncaught exceptions or layout failures. Existing external integrations: backend Meta vision/segmentation/search/chat, on-demand NWS requests, Esri map tiles, Google Fonts during build, and optional Google Maps directions on click. Photo selection and Memory Web accepted uploads, including EXIF parsing. No ElevenLabs, OpenFEMA fetch, analytics, camera, microphone, or geolocation permission API was found in the application source. The optional model diagnostic also makes paid requests when invoked; never run it for the public demo.

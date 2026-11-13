# Public concept demo

The public frontend builds to `apps/web/out` with no environment variables or runtime server. Do not deploy FastAPI for this version.

`apps/web/src/lib/api.ts` exports only the demo adapter. Its small `AgentClient`, `ScanClient`, and `ToolkitClient` contracts live in `lib/adapters/contracts.ts`. The original API client is retained in `lib/adapters/real.ts` and is never imported by the public entry point. Original model and image processing code remains in `apps/api`.

`lib/demo/config.ts` holds the hard-on `DEMO_MODE` constant, public link placeholders, and CSP. The CSP is emitted near the start of every page's head: `connect-src 'self'`, no frames, no workers, no external scripts, fonts, or images. The local map is an original schematic with fictional places; it uses no tile service. External official-source links open only when clicked, with no referrer.

`npm --prefix apps/web run build` produces the static export and automatically runs `scripts/check-demo-build.mjs`. The check rejects live API hostnames, secret variable names, upload inputs, permission calls, and missing CSP in the built files. System fonts remove the old Google Fonts build dependency.

The persistent concept banner explains the simulation. Reset demo clears only this app's browser keys and reloads to clear in-memory state. No analytics, account, server storage, or paid service is used.

## Fixtures and adding examples

- `lib/demo/prompts.ts`: ten handwritten prompt responses, the emergency-first keyword matcher, fictional resources, frozen sample bulletins, and sample plan. Existing sourced flood/wildfire safety flows are reused without live lookups. To add a prompt, add its chip, matcher rule, response cards, and intent test. Keep emergency matching first.
- `lib/demo/fixtures/photos.json`: 17 detections with cached bounding boxes from the saved hackathon scan. No fresh model calls were made. Six original images are used across three sets. The seventh view is explicitly a crop of the living-room image for the duplicate example, not independent evidence.
- `lib/demo/samples.ts`: sample set definitions, handwritten illustrative price ranges, and five withheld visible objects with handwritten boxes for Memory Web (laptop, clock, rug, cooking pot, potted plant). Prices have no retailer links. Memory room relationships and evidence grades are deterministic sample content.
- `lib/demo/claims.ts`: browser-only inventory adapter, merge/split archives, confirmation, and local storage with an in-memory fallback. No private images are accepted, even if the adapter is called directly. Reset or Clear sample inventory removes progress.
- `lib/demo/exports.ts`: dependency-free browser CSV, PDF, and XLSX generators. Only confirmed items are exported. Every PDF page and spreadsheet print header/footer says `SAMPLE, concept demo`. PDF thumbnails are re-encoded locally; the spreadsheet uses text cells, and CSV text is protected against formula interpretation. PDF text uses the built-in Latin font and substitutes unsupported characters.

To add a sample set, first review supplied originals for faces, personal information, and publication rights. Use at least six distinct suitable originals overall. Prepare metadata-free WebPs and thumbnails with `scripts/prepare_demo_photos.py` (requires the existing Python development dependencies and ignored saved scan output). Commit the generated public assets and JSON so deployment never needs Python or private files. Add the set to `samples.ts`; supply schema-valid detections and bounds, and test every view. Never download replacement photos or invoke a model as part of a public build.

## Baseline before conversion

At `f0ac7c6`, 37 frontend and 109 API tests passed; the production build passed. Twelve desktop/mobile route checks passed without uncaught exceptions or layout failures. Existing external integrations: backend Meta vision/segmentation/search/chat, on-demand NWS requests, Esri map tiles, Google Fonts during build, and optional Google Maps directions on click. Photo selection and Memory Web accepted uploads, including EXIF parsing. No ElevenLabs, OpenFEMA fetch, analytics, camera, microphone, or geolocation permission API was found in the application source. The optional model diagnostic also makes paid requests when invoked; never run it for the public demo.

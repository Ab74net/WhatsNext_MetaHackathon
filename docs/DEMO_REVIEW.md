# Public demo review

Prepared on `demo-mode`; nothing deployed or pushed. The pre-existing untracked editor workspace file was left untouched. No public URL or video URL has been supplied. Add them in `lib/demo/config.ts` before publishing; GitHub is already configured.

## Fixture inventory

- `lib/demo/prompts.ts`: ten handwritten responses, an unknown-input fallback, four fictional places/addresses, frozen fictional bulletins dated September 27, 2024, and a Today / This week / Deadlines plan. Safety flows reuse existing sourced JSON. No live conditions or resource availability are asserted.
- `lib/demo/scenarios.ts`: two hypothetical scenario summaries with no real coordinates or perimeters.
- `lib/demo/fixtures/photos.json`: 17 cached detections/boxes, from six supplied originals plus one labeled detail crop. No fresh inference. The coffee-table wide/detail duplicate is a fixture, not independent evidence.
- `lib/demo/samples.ts`: handwritten illustrative ranges for 17 item categories; five withheld visible objects with handwritten boxes (laptop, clock, rug, cooking pot, potted plant).
- `lib/demo/claims.ts`: static room relationships and sample evidence grades; local confirmation, editing, merge/split, and deletion.
- `lib/demo/client.ts`: six static insurer questions based on the original base list and one fixed document-answer fallback. The dated Virginia guide is reused without new verification.
- `lib/aidAutopilot.ts`: three sample sentences, deterministic keyword interpretation, and a local editable answer template. The five existing program records and deterministic matcher are retained; records are explicitly unverified.

No replacement photos, invented retail links, official deadlines, or fresh model calls were used.

## Every visible Meta / Muse reference

| Location | Text |
| --- | --- |
| Shared desktop header, all routes | `What Next × Meta Muse`, using `brand.json`'s partner field; hidden at narrow phone widths. |
| About, origin | `Meta Global AI Developer Hackathon, indie track` |
| About, original technology | `Meta’s Muse Spark` and `SAM 3.1` |
| About, independence notice | `Not affiliated with or endorsed by Meta, FEMA, or any insurer` |
| Our Story, belief paragraph | `Meta × Cerebral Valley AI Hackathon` |
| Our Story, closing attribution | `Meta × Cerebral Valley AI Hackathon` |
| GitHub link destination | Repository name `Meta2026Hackathon`; visible label is “View the source on GitHub.” |

The README also describes the historical Meta/Muse stack. Project and assistant names remain centralized in `packages/shared/brand.json`. Review the partner suffix before publishing if you want to change the presentation of the relationship.

## Hygiene findings

The read-only scanner inspected **572 reachable Git blobs across all locally available branches/remote-tracking branches** before the final checks commit. It checked credential/private-key formats, quoted/plain environment assignments, and the exact configured local key value. **No secret matches were found.** Only `.env.example` appears in reachable history among env/private-key filenames; its credential fields are blank.

The ignored local `.env` has populated `MODEL_API_KEY` and `MODEL_BASE_URL` fields. Values were not printed, transmitted, committed, or used by the demo. The configured key does not appear in the inspected history. No history was rewritten. The audit does not cover unknown/unfetched remote refs, reflogs, host logs, or previous external sharing.

Historical image paths contain public hero/Story/mascot derivatives, the icon, design references, UI screenshots, and the new sanitized sample derivatives. **No raw private/test-photo paths were found in reachable history.** Twenty raw test images remain ignored locally; only six reviewed derivatives are newly published in source. Other ignored originals/model output remain outside Git. Image provenance alone cannot establish whether an image is personal or licensed for publication.

Publication rights remain unresolved for existing disaster photography; see [IMAGE_CREDITS.md](IMAGE_CREDITS.md). The selected test set was outside the earlier reverse search, and individual authorship/permission records are absent. Confirm those rights before hosting. Images were retained according to the earlier instruction.

## Verification and limits

Baseline: 37 frontend tests, 109 API tests, production build, and 12 desktop/mobile page checks passed. New tests cover scripted routing, emergency priority, fallback, fictional pins, fixture bounds, local edits/merge/split, export filtering/formula protection, frozen alerts, and banned promises.

The Chrome journey exercises all ten prompts; sample scan/review/edit/remove/confirm/filter/manual merge/split; Memory Web with sample attachment; three downloads; Aid preparation; Toolkit; reset; and 18 desktop/mobile route checks. It observed **zero off-origin requests, uncaught exceptions, file inputs, or permission API access**. CSP blocked a deliberate external fetch. Independent parsers opened the **two-page PDF with six images** and **12-row XLSX**, with sample headers/footers. The temporary PDF validator is only in ignored output, not app dependencies.

The public bundle excludes live clients, API URLs/key names, uploads, permission prompts, external fonts/tiles, and analytics. FastAPI and original implementations remain outside its import graph. No ElevenLabs or live OpenFEMA implementation was found. Tile-provider terms do not apply to the original local schematic.

Automated checks of DisasterAssistance.gov, FEMA, and FEMA declarations returned **403**. USAGov independently identifies the official application destination. Normal-browser endpoint accessibility needs a manual check. Program details, eligibility, availability, declarations, and deadlines were not newly verified.

Until `SITE_URL` is set, sitemap entries and the absolute social image are deliberately omitted. The favicon, 404, robots, About/Privacy, and click-to-open video slot ship now. Browser checks use Chrome. PDF text uses a built-in Latin font and substitutes unsupported characters. These checks are not an accessibility certification or real disaster-response evaluation.

## Manual pass

1. Try each sample set, edit/confirm items, and explore a related Memory Web suggestion.
2. Download PDF/XLSX/CSV; check sample labels/totals; reset and verify progress clears.
3. Try sample, unknown, and injured prompts; inspect fictional pins and the 911 stop.
4. Edit an Aid checklist/template and Toolkit notes.
5. Check tour keyboard/Escape, mobile navigation, themes, About/Privacy, reference links, and the eventual video.
6. After setting the public origin and rebuilding, check sitemap/social-image URLs and direct routes/404 on the host.

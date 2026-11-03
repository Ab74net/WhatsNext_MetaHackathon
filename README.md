# What Next (working title) — disaster recovery assistant

> **Read this whole file before writing any code.** It is the project brief for Claude Code.
> The project name and agent name are NOT final (candidates: Cairn / Wren, What Next / Next). Keep both names in ONE constants/config file so renaming is a one-line change. Never hard-code them elsewhere.

## What we are building

A web app (mobile-first PWA) for people who have just lost their home or been displaced by a natural disaster. Two functions share one "case file" (location, hazard, inventory):

1. **Visual agent** (chat, optionally voice). It does not reply with walls of text. It calls tools and returns **UI instructions** (map pins, a plan card with deadlines, a safety flow) that the front end renders as cards, a real map, and animation. It points to official resources, live alerts, healthcare, FEMA and similar programs.
2. **Claims helper.** The user selects photos from their camera roll. The app finds belongings in them, merges the same item across photos, and builds a claim-ready inventory with evidence photos, exportable as a spreadsheet and PDF. A **memory web** (force-directed graph of related items) prompts the user to remember things they forgot.

One-line pitch: *a visual disaster-recovery agent that shows you where to go and what to do on a real map, plus a claims helper that rebuilds your home inventory from your camera roll.*

## Context: this is a hackathon entry

- **Event:** Meta Global AI Developer Hackathon, **indie developer track**, one solo developer (James).
- **Judged on:** creativity, technical ambition, and **whether it works**. A working end-to-end demo beats extra half-built features.
- **Themes:** "Build for Your World" (primary) and "Push the Frontier".
- **Deadline:** submissions due **Wed Nov 4, 2026 at 9:00 PM ET**. Target submitting by about 5 PM. Feature freeze **Tue Nov 3 at noon**. Finals Nov 9.
- Today is Oct 30 (around 12:40 PM ET). **James has NOT started building yet (midterms).** Assume an empty repo unless `git log` and the file tree show otherwise. About four working days remain before the Nov 3 noon freeze, so **scope is deliberately small: a working vertical slice beats breadth. Use the fewest moving parts that work.**
- The Official Rules were posted Oct 26. If a `RULES.md` or notes file exists, obey it (especially on third-party services such as ElevenLabs).

## Non-negotiable rules

**Privacy (users upload personal camera rolls):**
- Use the **standard** model IDs (`muse-spark-1.3`), **never** a `-contributor` variant (contributor tiers let Meta train on content).
- Process only photos the user explicitly selects. **Store nothing by default**; delete uploads and derived data when the session ends. No analytics on photo content. Never log image bytes or EXIF.
- Strip EXIF from all exports. Auto-skip photos of IDs, documents and screenshots.
- Never commit real personal photos. Demo and test images must be staged or consented (James's own or a friend's with permission).

**Honesty and safety:**
- Valuations are **estimates**. Mark each item `seen_in_photo` or `inferred`, show confidence, and **never inflate** a claim. Require the user to confirm each line before export.
- The **memory web only prompts** ("did you own this?"). Nothing enters the inventory without user confirmation plus evidence.
- **Safety instructions are pre-authored from official guidance** (Ready.gov, NWS, Red Cross; cite the exact page in the content file). The model may choose a branch and phrase it, but must **never invent safety steps**. Always show a "call 911" banner on safety screens, and label them general guidance, not local emergency instructions.
- If a user mentions injury or immediate danger: direct them to 911 or emergency care and stop.
- Every program, shelter or alert shown needs a **source URL and a "last checked" time**. When unsure, say so and give a phone number rather than guessing.
- State plainly in the UI that this is not insurance or legal advice.

## Models and APIs (verify against official docs at https://dev.meta.ai/docs)

Checked against the official docs on Oct 30 and with live calls on Oct 31: Spark structured output on images works, and so does SAM with base64 images.

- **Base URL:** `https://api.meta.ai/v1` (the `api.ai.meta.com` URL from third-party sources is wrong). Auth: `Authorization: Bearer $MODEL_API_KEY`. The OpenAI SDK works when you set `baseURL`. Chat Completions (OpenAI-compatible) and Messages (Anthropic-compatible) endpoints also exist.
- **Model IDs:** `muse-spark-1.3` (also 1.2, 1.1), `muse-wonder-1.0` (preview, $4 / $20 per M tokens), `sam-3.1`, `muse-image-1.0` ($0.01 per image), `muse-voice-transcribe-1.0` ($0.18 per hour, `POST /v1/asr/transcribe`). The `-contributor` variants exist and **are banned here**: under them Meta may train on prompts and files. Standard mode content "is not used to train Meta models". The docs state no retention period.
- **Muse Spark 1.3:** $1.25 input / $0.15 cached input / $4.25 output per M tokens. Context of 1,048,576 tokens. Web-search grounding costs an extra $2.50 per 1,000 queries.
- **Rate limits** (per team): Spark and SAM each allow 3,000 RPM; Spark also has 4M TPM. These limits will not constrain us.
- **Images to Spark:** `{"type":"input_image","image_url":"data:image/jpeg;base64,..."}` or `{"type":"input_image","file_id":...}` via `POST /v1/files`. Up to 50 images per request, 50 MB per inline image. Formats: jpeg, png, gif, webp. **HEIC is not supported**, so iPhone photos must be converted to JPEG in the browser before upload.
- **Structured output:** Responses `text.format = {type:"json_schema", name, schema, strict}`. Output is always schema-constrained; `strict` only adds server-side validation of the schema itself. Still validate with zod and retry once.
- **SAM 3.1:** `POST /v1/responses`, `model:"sam-3.1"`, one `input_text` noun phrase plus one `input_image` (or `input_video`), with `stream:true`. **Verified Oct 31:** base64 data URLs in `image_url` work (the Files API fallback stays in the code). Each call takes about 1–4 s. No confidence (`c`) was returned on boxes or masks in testing, so don't rely on it. Output is special-token text, one line per frame (`<0f>0<|box;...|><|mask;...|>,1<|box...`). An empty output means no match. Costs $2.50 per 1,000 images.
- **SAM parser:** the official one is **npm `@meta-sam/parser`** (`parseImageStream(stream).finalResult`, `recordsOfKind(records,"box"|"mask")`, `decodeMaskToSVGPath` / `decodeMaskToRaster` / `decodeMaskToRLE`), which takes the OpenAI SDK stream directly. A PyPI `meta-sam-parser` package also exists. `decodeMaskToSVGPath` gives frontend mask overlays at no extra cost.
- **Search grounding (verified Nov 1):** `tools=[{"type":"web_search","search_context_size":"low"}]` plus `include=["web_search_call.results"]`. It works together with `text.format` json_schema. `output_text` joins the model's progress notes with the answer, so parse the **last** `message` item. Sources come back in `web_search_call.results[].url`, `action.url` (opened pages) and `url_citation` annotations. We reject any price whose URL isn't among those, or that points to a search or category page. With the item crop attached, a lookup takes about 10 s.
- **Reasoning effort:** `reasoning={"effort":"low"}` cuts Spark image calls from about 7 s to 3 s with the same items found.
- **Voice:** Muse Voice Transcribe for speech-to-text (Spark also accepts audio). **ElevenLabs** (spoken replies) is optional and only allowed if the Official Rules permit it. Text-only must always work first, with browser speech synthesis as the fallback.
- Use structured output (JSON schema) for every model call whose result feeds code. Validate with a schema library and retry once on failure.

## Architecture (default stack; follow the repo if it already differs)

- **Frontend:** Next.js + TypeScript, mobile-first PWA. Map: **MapLibre GL** or Leaflet with OpenStreetMap tiles. Memory web: `react-force-graph` or d3. Animations: SVG/CSS step cards (Framer Motion is fine), not video.
- **Backend:** Python **FastAPI** (SAM output parsing, Spark calls, scheduled ingestion, export). SQLite for feed data and the curated assistance database. No database tables for user photos.
- **Scheduler:** a simple cron or APScheduler job for hourly and daily pulls.

### Agent tools (the agent returns UI instructions, not paragraphs)

| Tool | What it does |
| --- | --- |
| `get_alerts` | Latest official alerts for the user's location |
| `find_resources` | Programs, shelters and clinics from the curated database |
| `show_map` | Pins, polygons and routes on a real map |
| `start_claim` | Opens the claims helper with the case file |
| `show_safety_flow` | Plays a pre-authored safety flow for the hazard |
| `draft_letter` | Drafts claim or application text for the user to review |

Define a typed `UIInstruction` union (`MapView`, `PlanCard`, `SafetyFlow`, `ResourceList`, `ClaimStart`, ...) shared between backend and frontend, and render each variant with its own component.

### Claims pipeline (five stages)

1. **Ingest:** multi-select photo picker (a browser cannot truly "connect" a camera roll; a Google Photos picker is a stretch goal). Read EXIF date and GPS. Let the user filter by date range or album.
2. **Find items:** SAM 3.1 with text prompts per category; collect masks and crops.
3. **Identify:** Spark looks at each crop and returns JSON: `category`, `brand`, `model`, `condition`, `confidence`, `evidence` (`seen_in_photo` or `inferred`).
4. **Merge across photos:** cluster by EXIF location and date, then have Spark compare crops to decide whether two detections are the same item. This is the hardest step. **Fallback if it is not working:** per-photo item lists with manual merge in the UI.
5. **Value and export:** replacement-cost estimates via search grounding, with source links. Export a spreadsheet (xlsx or csv) and a PDF with the evidence photo beside each item.

### Memory web

Each confirmed item and room becomes a node. Spark returns commonly related items as structured output (a sofa suggests side tables, lamps, a rug, TV, pillows). Clicking a node opens "add item with photo evidence". Each item also shows an **evidence grade** (dated photo, visible brand, receipt) and where to find more proof.

### Live data (verify each source works before building on it)

- **Time-boxed MVP: build ONLY NWS alerts (fetched on demand when the agent calls `get_alerts`) plus the seeded resource file.** Everything below is stretch.
- Hourly: National Weather Service alerts, USGS earthquake feed, NASA FIRMS fire hotspots (needs a key).
- Daily: OpenFEMA disaster declarations, plus the curated assistance database.
- Store each pull and have Spark summarize "what changed near you since last check".
- **No single shelter or clinic API is known.** For the demo region, hand-seed shelters and clinics in a clearly labeled seed file (source and date on every row); keep alerts live.
- Official sources lead; news sites are secondary and labeled as such.

### Assistance engine

A hand-curated knowledge base (YAML or JSON) of programs: FEMA Individual Assistance, SBA disaster loans, disaster unemployment, state programs, document replacement, utilities. Each entry has an official source URL, a verified date and deadlines. Rules decide what might apply; the model explains it in plain language and drafts paperwork. Output is a plan: *Today / This week / Deadlines*.

### Survival flows

Build **one** flow well, matching the demo scenario: the app asks a question (for example "what is the water level now?"), the answer picks one of 3 or 4 branches, and animated step cards play. Content lives in a data file with a source citation per step.

## Homepage

The homepage is the first thing judges and video viewers see, so it should be cinematic but calm. Idea: a full-bleed hero where different disasters (wildfire, flood, earthquake) **flicker in and out cinematically**, resolving into the product's promise and a single clear call to action (for example "Start here" leading into the agent). Think dignified, not sensational: users on this site have just lost something.

- **Cheapest build (default):** 3 original still images (AI-generated with Muse Image, generic scenes with no identifiable people or real victims, or royalty-free images with a verified license) layered full-bleed. Crossfade between them every few seconds with a slow zoom, a light film-grain overlay, and a subtle per-disaster effect in CSS or canvas (drifting embers for wildfire, rain streaks for flood, a gentle screen tremor for earthquake). No video assets needed. Check the Muse Wonder docs before assuming it can make video.
- **Safety and accessibility (required):** keep flicker slow. **No more than three flashes in any one second**, no strobing, no large high-contrast flashes (photosensitivity). Respect `prefers-reduced-motion` by showing a static image. Keep text contrast readable over imagery, and never autoplay sound.
- **Copy:** a short human headline such as "Lost your home? Start here." with one line under it. Do not use fear imagery as decoration beyond the hero.
- **Scope:** about one to two hours total, scheduled for Nov 2. Make it last in priority; a static hero image is an acceptable fallback.

## Suggested repo layout (create only what is needed)

```
/apps/web            Next.js frontend (agent UI, map, memory web, claims UI)
/apps/api            FastAPI backend (agent, pipeline, ingestion, export)
/packages/shared     Shared types (UIInstruction, InventoryItem schemas)
/content             Assistance database, safety flows, seed shelters (all with sources)
/scripts             Day-1 model test, demo photo set loader
/docs                Architecture diagram, demo script
```

Item schema (keep stable; export and UI depend on it):

```json
{
  "id": "string",
  "category": "sofa",
  "brand": "string|null",
  "model": "string|null",
  "condition": "good|worn|damaged|unknown",
  "confidence": 0.0,
  "evidence": "seen_in_photo|inferred",
  "photos": [{"photo_id": "string", "taken_at": "ISO-8601|null", "mask": "..."}],
  "estimated_replacement_usd": {"low": 0, "high": 0, "source_url": "string"},
  "user_confirmed": false
}
```

## Running locally (Windows)

1. One-time setup: `npm run setup` (installs Node packages and creates `apps/api/.venv`). Python 3.15 needs `--only-binary=:all:`, which the setup script already passes.
2. Copy `.env.example` to `.env` and set `MODEL_API_KEY`. Without a key the backend runs in **mock mode** (fake, clearly labeled results).
3. `npm run dev` starts FastAPI on :8000 and Next.js on :3000. Open http://localhost:3000/claims. The browser only talks to Next, which forwards `/api/*` to FastAPI.
   - The backend restarts automatically when a `.py` file changes (via `watchfiles`; uvicorn's own `--reload` hangs on Python 3.15 on Windows). A restart **clears all sessions**, because photos are kept in memory only.
   - If a port is stuck or the app seems to run old code: `npm run stop`, then `npm run dev`.
4. Tests: `npm run test:api`. Model check on staged photos: put them in `scripts/test_photos/`, then `cd scripts; npm run day1`.

## Scenario content (`/content/spokane`)

All hand-checked on Nov 2, 2026. Every row has a source URL; news sources are labeled as such.
- `scenario.json`: two presets. **"Aug 2, 2026 · during the fires"** is a clearly labeled replay with recorded alerts. **"Today · recovery"** is the present. Live NWS alerts are fetched in both.
- `perimeters.geojson`: the official NIFC WFIGS final perimeters for the three fires, simplified.
- `resources.json`: shelters, animal evacuation, hospitals and recovery help. `phases` controls when each one is shown.
- `programs.json`: the assistance knowledge base. As of Nov 2: FEMA Individual Assistance is **pending** (only emergency declaration EM-3650 exists; a Major Disaster Declaration was requested in late Sept), SBA loans are **not available**, and the state Household Needs Grant is open with **no published deadline**. Never add a deadline the official source doesn't publish.

## Design

Warm, editorial look matched to the six references in `scripts/mockupsfornehomepage/`. Shared colors, type, spacing and radii live in `apps/web/src/app/globals.css`; shared pill buttons, bordered cards and the stepper live in `components/ui.tsx`. Fonts: Inter (UI) and Inter Tight (headings). The wordmark reads `projectName × partner` from `packages/shared/brand.json`.

The system theme is used until the user chooses light or dark with the navigation toggle. The centralized resolver in `apps/web/src/lib/theme.ts` applies the saved choice before paint, follows OS changes when no manual choice exists, and synchronizes other tabs. If storage is blocked, the system preference and an in-memory manual choice still work. Both themes cover claims, Memory Web, safety cards, Toolkit, Aid Autopilot and the tour. Printing forces light colors. The map retains its existing provider and attribution. See `docs/FRONTEND_REDESIGN.md` and `docs/FRONTEND_AUDIT.md` for verification details.

**Take a tour** now has 11 stops: the assistant and map, the claim workflow, Aid Autopilot discovery and its reviewed assistant handoff, then Our Story. It highlights the current feature and navigates between pages without answering questions, sending messages or submitting applications. Existing aid details are retained. Replay it from the header or footer; Back, Skip tour and Escape remain available.

Memory Web now supports cursor-centered wheel zoom, drag panning, touch pinch, zoom controls, Reset and Fit. It uses the existing d3-force/SVG stack with non-overlapping labels, cached positions, and curved links. Refresh preserves the camera and graph; a suggestion turns into a confirmed node only after evidence and a successful server confirmation. The header link and `/claims#memory` also provide an empty state before inventory exists.

The graph's camera, positions, selection, confirmed-suggestion mapping and dismissals also survive trips between the claim steps. Pointer gestures handle delayed touch clicks, cancellation, lost capture and leaving the window. This state stays in the claim session's memory and clears when the session ends.

The slideshow starts with the five files in `scripts/photostoplayfirst/` in natural order, then the original five images. Metadata-free WebPs and the generated introduction manifest ship in `apps/web/public/hero/`; rebuild those copies with `apps/api/.venv/Scripts/python scripts/prepare_intro_photos.py`. Sources 3 and 4 are cropped to exclude foreground people. The raw sources remain unchanged and git-ignored.

## Our Story (`/our-story`)

A personal account of the founder's experience as a Virginia Tech student during the 2024 New River Valley flooding, and why this developing project exists. The editorial page reuses the app shell, shared theme tokens and buttons. It is linked in the desktop header, footer and the smaller-screen **More** menu, which also provides Memory Web, Toolkit and Privacy links.

Three supplied NRV photos (`scripts/nrv_photos/3.jpg`, `2.jpg`, `4.jpg`) ship as uncropped, responsive WebPs with source metadata removed. Rebuild them with `apps/api/.venv/Scripts/python scripts/prepare_story_photos.py`. Originals remain unchanged and ignored. Event captions use the developer's description of the collection; the files have no reliable location/date metadata, so the page does not assign specific locations or dates to individual images. Photo rights remain unverified; see `docs/IMAGE_CREDITS.md`.

## Aid Autopilot (`/aid`)

Explore assistance resources through five optional questions, review your situation, filter demo program cards, and prepare a document checklist. Each record has provider links, source-review dates, eligibility limitations, and an explicit demo label. Discovery filters a static catalog by disaster type and needs; it does **not** verify an address, active declarations, availability, deadlines, or eligibility.

Questionnaire answers, saved links, application status and preparation notes stay in memory while navigating the app; reload or **Clear my aid details** clears them. Download JSON or print a preparation summary to keep a copy. Completing a checklist never submits an application. **Ask the assistant** prepares a message containing the selected program and confirmed situation for review; it sends no preparation notes, photos or evidence, and does not send a message automatically. The assistant's map still uses its selected demo scenario.

The catalog is `apps/web/public/aid-programs.json`; the replaceable adapter, validation and filtering live in `apps/web/src/lib/aidAutopilot.ts`. See [Aid Autopilot implementation and test guide](docs/AID_AUTOPILOT.md).

## Second demo scenario (`/content/nrv`)

Ask Wren has a **Demo scenario** switch: Spokane Complex Fires (default) or a **hypothetical** New River Valley flood modeled on the September 27, 2024 Helene flooding (USGS alert, WVTF, FEMA DR-4831-VA). It is labeled hypothetical in the UI and in Wren's instructions. The places (hospitals, county offices, animal center) and programs (Red Cross, 211 Virginia, NFIP claims, FEMA IA, SBA) are real and sourced; no shelters are listed because real shelters are announced during an event. Safety steps: `content/safety/flood.json`, quoted from Ready.gov: Floods and FloodSmart. Scenario ids live in `ScenarioId` (schemas.py and types.ts); adding one means a new content folder plus that id.

## Safety flow, map and mascot

- `content/safety/wildfire.json`: five branches (Level 3 GO, Level 1/2, trapped, smoky, returning home). Every step quotes [Ready.gov: Wildfires](https://www.ready.gov/wildfires) or Spokane County's evacuation levels, with the source shown on each card. The agent's `show_safety_flow` tool picks only the starting branch. The trapped branch starts with Call 911.
- Map: Esri World Imagery satellite tiles plus a labels overlay, as an inline raster style. There's no API key, and attribution is shown. For anything beyond a demo, check Esri's terms.
- Mascot: Wren (`apps/web/public/wren/*.webp`). The poses are idle, thinking (waiting on the model), typing (reply being shown) and searching (scanning photos and the memory web). The agent name lives in `packages/shared/brand.json`.

## Build order (reconcile with the repo's actual state first)

Priorities, highest first. Never cut the claims inventory and export, the agent with its map, or the demo.

| Date | Focus | Done when |
| --- | --- | --- |
| Oct 30 (afternoon and evening) | API key, `scripts/day1_model_test` (about 20 staged photos through Spark and SAM 3.1), scaffold, photo upload, item extraction | Photos in, a validated list of item JSON out |
| Oct 31 | Inventory UI, simple cross-photo merge (group by EXIF time, one Spark comparison per candidate pair; manual merge UI as fallback), valuation, spreadsheet and PDF export | A user can go photos to downloaded claim file |
| Nov 1 | Agent shell returning `UIInstruction`s, map with NWS alerts fetched on demand, seeded resources, plan card, `start_claim` hand-off to the claims helper | The agent and the claims helper work together on one case file |
| Nov 2 | Memory web, homepage cinematic loop, one pre-authored safety flow (a static animated version is fine) | Everything in the demo script runs once end to end |
| Nov 3 | Morning: integration and bug fixes only. **Feature freeze at noon.** Afternoon: demo video, README, architecture diagram, submission text | Backup demo video recorded |
| Nov 4 | Buffer only; submit by about 5 PM ET | Submitted |

**Cut list, in order, if behind (cut from the top first):** ElevenLabs voice, offline-ready PWA, extra languages, Google Photos picker, extra live feeds (USGS, FIRMS, OpenFEMA) and the hourly scheduler (fetch NWS on demand instead), evidence grades on the memory web, the homepage video-style effects (a static image is fine), and the animated safety flow (a static step-card version is fine). **Do not cut:** the claims inventory and export, the agent with its map, and a demo that runs end to end.

**Stretch features (only after the core demo works end to end):** offline-ready PWA plus printable PDF plan, document replacement order, one-tap "I'm safe" message, insurer-call prep sheet. "Prepare mode" (running the scan before a disaster) is a roadmap slide only, not something to build.

## Demo target (3 minutes, staged consented photos)

0:00 homepage cinematic loop (about 5 s), then the problem (lost home, no inventory) → 0:15 talk to the agent: alerts, plan card, resource map → 0:50 upload about 40 photos, inventory builds with masks highlighted → 1:30 memory web suggests forgotten items, add one with evidence → 2:00 claim export (spreadsheet and PDF) → 2:20 wildfire safety flow plays (about 15 s) → 2:40 close on privacy and honesty safeguards. Also record a backup video. **Decided (Nov 2): the August 2026 Spokane Complex Fires (Old Trails, Fairview, Autumn Lane).** Keep all demo content consistent with it. A Virginia flood example is a stretch goal only. The Phase 5 safety flow must therefore be a wildfire flow, not the water-level flood flow.

## Working agreement

- **Start here:** (1) inspect the repo and report what exists; (2) run or write `scripts/day1_model_test` to confirm the real API shape, model IDs and rate limits; (3) update the "Models and APIs" section of this file with what is actually true; (4) propose the smallest next step toward the build order above.
- Prefer the smallest working vertical slice over broad scaffolding. Every feature should be demoable end to end before moving on.
- Keep secrets in `.env` (never commit). Provide `.env.example`.
- Write short tests for the item schema, the SAM output parsing, the merge logic and the export.
- When something in this file turns out wrong, fix it here and tell James.
- **Ask James before:** adding a paid or third-party service, storing any user data, or changing the privacy or safety rules above.

## Open decisions (ask James if still undecided)

- Final project and agent names (kept in one constants file).
- ~~Demo scenario~~: decided, Spokane Complex Fires (Aug 2026).
- Whether ElevenLabs voice is allowed by the Official Rules.

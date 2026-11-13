# What Next

**A disaster recovery concept, built from a problem I saw while volunteering.**

During the 2024 New River Valley floods, I helped residents who struggled to remember the belongings they had lost. What Next explores how everyday photos could help rebuild that inventory and make the next step toward recovery clearer.

Built solo by Ashraf A., a Virginia Tech student, for the Meta Global AI Developer Hackathon, indie track, with Cerebral Valley. The assistant is **Wren**. Project and assistant names are centralized in [brand.json](packages/shared/brand.json).

## Public portfolio demo

This version is **fully static and simulated**. It accepts no photos, runs no models or live chat, needs no API keys or backend, and adds no analytics. Text stays in the visitor’s browser. The persistent concept banner and About/Privacy pages explain the limits.

| Feature | Try it | What is simulated |
| --- | --- | --- |
| Scripted assistant | `/agent/` | Ten prompts, local keyword matching, sample alerts, plans, safety walkthroughs, and fictional resource pins on a local schematic. |
| Sample inventory | `/claims/` | Three supplied photo sets, precomputed outlines, staged scan animation, local edits/confirmation, duplicate merge/split, and sample estimates. |
| Memory Web | `/claims/#memory` | Static related-item suggestions with a supplied sample-evidence option. Nothing enters an export without confirmation. |
| Sample exports | Final claim step | Browser-generated PDF with images, XLSX, and CSV. Every document is marked **SAMPLE, concept demo**. |
| Aid Autopilot | `/aid/` | One-sentence sample matcher, editable example situation, dated program records, evidence checklists, template drafts, and local tracking. No eligibility decision or application submission. |
| Recovery Toolkit | `/toolkit/` | Static insurer questions and Virginia document ordering, with notes kept on the device. |
| Our Story | `/our-story/` | The volunteering experience and original idea. |
| About / Privacy | `/about-demo/`, `/privacy/` | What the original prototype did, what this version simulates, and browser storage/reset behavior. |

The site retains mobile layouts, keyboard navigation, the guided tour, reduced-motion support, and an explicit dark-mode toggle. Light is the default. Sample claim progress and Toolkit notes can use local storage; chat uses this tab’s session storage; Aid details stay in memory. **Reset demo** clears app-owned browser state.

**For real emergencies, call 911.** For actual assistance use [DisasterAssistance.gov](https://www.disasterassistance.gov/) and [FEMA](https://www.fema.gov/). This project has no current emergency or resource information. Independent concept project; not affiliated with or endorsed by Meta, FEMA, or any insurer. Not insurance or legal advice.

## Run locally

Use Node **22.18+** (Node 24 tested) and npm. Python and environment variables are unnecessary for the public site.

```sh
npm run setup
npm run dev
```

Open `http://localhost:3000`. This starts only the frontend. To test the actual static artifact:

```sh
npm run build
npm run preview
```

Open `http://127.0.0.1:3000`. Publish only **`apps/web/out`**. No deployment has been performed. See [DEPLOY.md](docs/DEPLOY.md) for host options, CSP, URL/video settings, and the pre-publish checklist.

## Checks

```sh
npm run test:web
npm --prefix apps/web run lint
npm run build
npm run test:demo
npm run audit:repo
```

The browser check requires local Chrome/Chromium and exercises the complete workflow, downloads, reset, desktop/mobile layouts, and the network firewall. Its screenshots and reports go to ignored `scripts/out/demo-browser`. The build automatically rejects secret variable names, model/API hosts, file inputs, media permission APIs, and missing CSP in exported files.

The history audit is read-only. It prints categories and locations, never key values, and does not rewrite commits. An ignored local `.env` can remain for original-backend work; the public frontend does not read it. `.env.example` contains no real keys.

## Stack and original prototype

The public demo uses **Next.js, React, TypeScript, Tailwind CSS, motion, and d3-force/SVG**. It has no runtime server or database, no external map tiles or fonts, and no model client in its bundle. CSP enforces `connect-src 'self'`. Same-origin requests retrieve static files only; official references and the optional video open only when clicked.

The original hackathon implementation used **Python/FastAPI**, **Meta Muse Spark 1.3** for photo identification, duplicate comparison, estimates and Wren tool responses, and **SAM 3.1** for object segmentation. Its flow was identification → segmentation → cross-photo comparison → human review → confirmed export. The real backend and original API adapter remain in the repo for future development, excluded from the public import path. The original live frontend is also preserved in Git history.

| Directory | Contents |
| --- | --- |
| `apps/web/src/lib/demo` | Public fixtures, scripted prompts, local inventory adapter, exports, and deployment constants. |
| `apps/web/src/lib/adapters` | Small client contracts and the retained real HTTP adapter. |
| `apps/web/public/demo` | Optimized, metadata-free supplied sample images. |
| `apps/api` | Retained real pipeline, models, image handling, merging, and server exports. Never deploy for this demo. |
| `packages/shared` | Shared schemas and brand names. |
| `content` | Dated source material for safety and document guides; no live ingestion. |
| `docs` | [Demo internals](docs/DEMO_MODE.md), [deployment](docs/DEPLOY.md), [review findings](docs/DEMO_REVIEW.md), [image credits](docs/IMAGE_CREDITS.md), and the original video script. |

For original backend development on Windows, `npm run setup:original` installs its dependencies, and `npm run dev:api` explicitly starts FastAPI. Tests run with `npm run test:api` and force mock mode. On macOS/Linux, create `apps/api/.venv`, install `apps/api/requirements.txt`, and run `.venv/bin/python -m pytest -q` from `apps/api`. Starting the backend does not turn on live behavior in the public frontend.

The optional `scripts/day1_model_test.mjs` is an original **paid model diagnostic**. It is not used by builds or automated tests. Do not run it for this public demo.

## Before publishing

Read [IMAGE_CREDITS.md](docs/IMAGE_CREDITS.md). Existing disaster photography has unresolved publication rights; a source match or attribution is not permission. The six sample originals were supplied for the demo, but individual authorship/licence records are not in the repository. Confirm publication rights before hosting.

No public URL is assigned yet. Fill `SITE_URL` and, optionally, your unlisted video link in `apps/web/src/lib/demo/config.ts` before the final publish build. Program records are dated snapshots with unverified details; always use official sites for current rules. The project has not been evaluated for actual disaster response or insurer acceptance.

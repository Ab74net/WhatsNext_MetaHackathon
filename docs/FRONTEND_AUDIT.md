# Frontend audit and repairs

This audit follows the November 2 request to repair the merged frontend, restore system-aware themes, improve Memory Web interactions, and introduce five new homepage photographs. It preserves backend endpoints, models, schemas, content and source data.

## Findings and fixes

- Git showed a clean fast-forward history at `4468da2`, with the features present on `master`. No unresolved merge markers, missing feature routes, or discarded branches were found. The concrete problems were in the frontend implementation rather than a conflicted merge.
- Memory Web ran a new force layout for every inventory change, then clamped positions to a fixed 900×560 world. This squeezed labels against the borders and moved existing nodes. Its circle-based collision did not guarantee separation for wide labels, and the 640px SVG minimum forced internal scrolling on phones. There were no graph viewport controls.
- The graph is now isolated in `components/claims/MemoryGraph.tsx` and `lib/memoryGraph.ts`. The existing d3-force library supplies initial placement; a rectangular-label pass resolves overlaps without edge clamping. Existing positions are cached and pinned, including the location where a suggestion becomes a confirmed item. Curved links distinguish relationships. Root, room, item and suggestion nodes all have keyboard-accessible details.
- Cursor-centered wheel zoom, drag panning, two-touch pinch, zoom buttons, Reset (100% centered on home), and Fit use a bounded SVG viewport. Wheel and touch gestures are confined to the canvas. Resizing preserves the world center; normal updates and refreshes retain the camera.
- The old theme intentionally forced light mode under the earlier brief and did not observe OS changes. The new request supersedes that policy. `lib/theme.ts` now shares one resolver between before-paint startup and the live toggle: a valid manual preference wins, otherwise use the OS. It handles other-tab changes and blocked storage. Existing semantic palettes and light printing are retained.
- The header Memory Web link relied on native `hashchange` while Next navigation could update the hash without emitting it. `useLocationHash.ts` now synchronizes same-page links, active navigation and claim steps while preserving the in-memory session. Fresh Memory Web visits show an actionable empty state.
- Refreshing memory previously unmounted the graph and lost its viewport. The frontend memory state now retains the last good result while refreshing, including after an error.
- A remembered-item confirmation was reflected in the graph before the server saved it. The frontend now waits for the existing PATCH response, restores a rejected optimistic edit, and lets the user retry. Photo evidence and user confirmation remain required. There are no new backend routes or automatic inventory additions.
- ESLint was scanning the generated, ignored MapLibre worker, producing 1,103 vendor warnings. The exact generated filename is now excluded. A synchronous state reset in Aid Autopilot's discovery effect was also an error; loading is now set by the initiating event and initial mount state. No application lint rule was disabled.

## Homepage sequence

The new first five entries are `1.jpg → 2.jpg → 3.png → 4.jpg → 5.png`, followed by `wildfire → flood → hurricane → earthquake → tornado` from the existing sequence. No original slide was removed.

`scripts/prepare_intro_photos.py` writes optimized, metadata-free public WebPs and a deterministic manifest/module. Photos 3 and 4 are cropped to exclude foreground people, while retaining the house and damage. Source files are untouched. Production uses public assets and does not depend on the scripts directory at runtime.

The hero mounts and preloads the next image, decodes a requested frame before changing the active image, and keeps the last good frame when a replacement fails. The existing 6-second cadence, 2-second crossfade and slow zoom remain. Pause and reduced-motion preferences are preserved; manual thumbnail selection still works without animation under reduced motion.

## Verification

Commands, run from the indicated directory:

- `apps/web`: `npm run lint`; `node node_modules/typescript/bin/tsc --noEmit`; `npm run build`.
- Repository root: `npm run test:web` (30 tests) and `npm run test:api` (79 tests).
- `apps/api/.venv/Scripts/python scripts/prepare_intro_photos.py`; Pillow verification of all new WebPs for absence of EXIF, XMP and ICC source metadata.

Regression tests cover dense graphs without label overlaps, persistent positions, duplicate-node prevention after confirmation/refresh, unconfirmed-item exclusion, cursor anchoring and zoom limits, Fit framing, theme bootstrap/system/manual policy, slide ordering, and every public image variant.

Headless Chrome uses an isolated mock backend, synthetic room evidence and a synthetic dense-graph stress fixture; no live model calls or personal claim photos are used. Checks cover both themes on Home, Privacy, the assistant/map/safety cards, photo selection, scanning, review, Memory Web, export, Aid Autopilot, both Toolkit tabs and the tour. Additional checks exercise OS changes, manual overrides/reloads, cross-tab changes, invalid preferences, blocked storage, before-paint theme choice, and light print colors.

Graph checks exercise real wheel and mouse events, two-touch pinch, keyboard selection, all viewport controls, refresh and refresh failure, suggestion dismissal, failed-confirmation rollback, successful evidence confirmation, the resulting four-row inventory, and PDF/XLSX/CSV downloads. Slideshow checks inspect all ten entries in order with accelerated test timers, a real six-second transition, decoded frames, pause, reduced motion and public assets. Desktop, 390px phone and additional 320/768/1024px views are checked for page-level horizontal overflow. Local screenshot artifacts are ignored under `scripts/out/redesign/` with `audit` in their names.

## Practical limits and manual demo check

- Live model accuracy and live NWS availability are not validated by mock tests. The UI retains the existing source-unavailable fallback. Aid discovery remains explicitly demo-based.
- Image source licences/credits remain unverified; see `IMAGE_CREDITS.md`. The implementation does not assert usage rights.
- The existing `next/font/google` setup needs network access at build time if fonts are not cached. One sandboxed build could not reach Google Fonts; the final build passed with network access. Runtime fonts remain self-hosted by Next.
- Node's existing module-type warning appears during the native TypeScript tests; the tests pass. The package module type was preserved to avoid changing Next configuration semantics.

The existing full Aid Autopilot browser regression also passed on the final build: optional questions, filtering, preparation and JSON/printing, memory-only navigation/reload behavior, reviewed assistant handoff without notes, and loading/error/retry/empty states.

For a final real demo, run `npm run dev`. Check OS theme on a fresh visit, select a manual theme, reload, and navigate. Scan consented staged photos, confirm inventory, open Memory Web from the header, zoom/pan/pinch, add an item with evidence, refresh, and check its review/export line. Inspect price sources and download all formats. On a phone, use Fit for an overview and zoom to read individual labels. Check safety citations and 911 banners, the Toolkit printout, Aid preparation and the tour.

## Memory Web follow-up and Our Story

The follow-up request identified moving, zooming and selecting in Memory Web as the problem. The renderer previously selected on pointer release, then suppressed the browser click for one animation frame. That timing window was fragile for delayed touch activation. It also did not release interrupted gestures on lost capture or window blur. `lib/memoryGestures.ts` now tracks pan/pinch and consumes each native click once, handles cancellation, and resets when the page loses visibility or focus. Mouse focus no longer recenters an edge node; keyboard focus still brings offscreen nodes into view.

The graph's cache and review state were component-local, so moving to Review or Export discarded positions, camera, selections, dismissals and suggestion-to-inventory links. `useClaimSession.ts` now owns that memory-only state and resets it at session end. ResizeObserver restores the saved view using the measured canvas dimensions. Metadata edits with all surviving nodes pinned skip force simulation. Room details include newly confirmed belongings immediately; invalid selections show the instructions instead of an empty panel. Smaller screens have a selected-details button beneath the graph.

`/our-story` is a prerendered App Router page using the shared shell, theme tokens and CTA buttons. Its first-person story uses only the supplied biography, identifies the project as developing, and explains that AI output requires verification. `our-story/story.css` provides the editorial serif layout; `components/story/StoryReveals.tsx` adds optional entry motion without hiding content before JavaScript. Reduced motion skips those effects.

The page uses `nrv_photos/3.jpg` for the aerial hero, then `2.jpg` and `4.jpg` for the gallery. Nine public WebP variants retain the originals' aspect ratios and omit EXIF/GPS/XMP/ICC metadata. All four supplied JPEGs were inspected. Event captions rely on the developer's collection description, with no inferred individual locations/dates; credits and unverified licensing are recorded in `IMAGE_CREDITS.md`.

Our Story is linked from the desktop header and footer. Below 1280px, the five-slot bottom navigation includes an accessible native **More** popover for Our Story, Memory Web, Toolkit and Privacy. The active page is highlighted; Escape and outside clicks close the popover. Existing routes remain available.

Verification for this follow-up:

- `npm run lint`, `node node_modules/typescript/bin/tsc --noEmit`, and `npm run build` passed in `apps/web`; the build includes `/our-story`.
- `npm run test:web` passed all 36 tests, including six new gesture regression cases. Backend source and schemas were unchanged.
- Isolated headless Chrome inspected every story section and all three loaded photographs at 320, 390, 768, 1024, 1280 and 1440px in both themes, with no page overflow. Theme-token contrast checks, active navigation, mobile menu/Escape, both CTAs and reduced motion passed. Desktop/light and phone/dark screenshots were visually reviewed.
- In the production preview, native wheel/drag/pinch, mouse and touch activation, interrupted pointer capture, stable refresh/error handling, evidence confirmation rollback/retry, dismissal and Review/Export round trips passed. Positions/camera and the resulting four-item inventory were checked, as were PDF/XLSX/CSV downloads, Toolkit, printing, tour and blocked-storage fallback. This used an isolated mock backend and synthetic evidence, not live model calls.
- Pillow verified all nine new public image variants had no source metadata. No source photograph was cropped or overwritten.

The final build passed after clearing two stale generated output directories (`.next/server/app/our-story` and `our-story.segments`) with native PowerShell. OneDrive had marked these directories as reparse points, which caused Next's Node cleanup to fail with EPERM. No tracked source or original photos were removed.

## Guided tour extension

The tour now has 11 stops. After the original assistant and claims steps, it introduces Aid Autopilot discovery, the reviewed handoff to the assistant, and the personal inspiration in Our Story. Aid anchors cover both the landing and existing-results views without resetting provider state or sending a message. The first-visit offer describes the expanded scope, while the existing seen preference is preserved.

Browser walkthroughs exposed two positioning issues: route scroll restoration could move the Aid highlight offscreen when returning from Our Story, and a fixed estimate of dialog height could clip cards on tablets. Anchor tracking now waits for the target route and reframes after scroll restoration or content shifts; card placement uses its measured height with a bounded scrollable dialog. Closing the tour chooses a visible tour launcher when the original opener is gone or cannot receive focus. The first-visit offer also uses the shell's current mobile-navigation breakpoint.

Verification passed: lint, TypeScript, production build and all 36 frontend tests. Headless Chrome walked all 11 stops and Back/Done at 1440, 768, 390 and 320px in both themes, checking visible highlights and dialog bounds. It also verified existing Aid results and saved links, Escape, Skip, replay, reduced motion, focus restoration and no automatic assistant sends or browser exceptions. Backend requests used the isolated mock server. New desktop and phone tour screenshots are ignored local artifacts under `scripts/out/redesign/tour-*`.

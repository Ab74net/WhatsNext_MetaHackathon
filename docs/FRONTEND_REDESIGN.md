# Frontend redesign

Visual references: the six PNGs in `scripts/mockupsfornehomepage/`.

The homepage now uses a large two-column composition, an organic photo crop, flat blue/coral shapes, and a full-width thumbnail strip. The shared header, typography, pill buttons, bordered cards, scan checklist, item rows, graph nodes, export summary, Toolkit and safety cards use the same tokens. Names continue to come from the shared brand file.

The current theme policy follows the OS when no manual preference exists, as requested in the subsequent frontend audit. The theme button stores only the theme choice; the shared resolver applies it before paint and observes later OS changes. Blocked storage falls back to the OS, and a manual choice still works for that visit. Print colors are forced light. The dark map filters the existing canvas, keeping its provider and attribution. See `FRONTEND_AUDIT.md` for the current graph, photography and regression checks.

## Deliberate differences

- Existing local disaster photos are retained; the references use different photographs.
- Memory Web remains a fifth claims step to preserve the existing flow. Its header link opens the step in the current claims session once an item is confirmed; a fresh session still starts with photo selection.
- Inventory counts, confidence, conditions, sources, replay/hypothetical labels, and estimate availability follow actual state. Price estimates remain in the export step, where they are fetched today. No room selector or unsupported inventory field was invented.
- Toolkit remains available in the mobile navigation and footer. Privacy links to the homepage's privacy promises. The stacked-stone mark is retained.
- The map shows actual seeded resources and perimeters. No mock addresses, availability claims, or deadlines were copied from the reference.

## Verification

- Production build and TypeScript checks.
- Existing frontend tests: 13 passed. Existing API tests: 79 passed.
- Headless Chrome with a separate mock backend and a synthetic room image: upload → scan → review → confirmation → Memory Web → PDF/XLSX/CSV downloads.
- Desktop (1440px) and phone (390px) captures in both themes for Home, Wren, safety cards, photo selection, scan, review, evidence viewer, Memory Web, export, both Toolkit views, and the tour. Screenshots are local ignored artifacts in `scripts/out/redesign/`.
- Fresh light visit, saved dark reload before first paint, blocked storage, theme switching, AA text-token contrast pairs, keyboard selection in the graph, Escape in the evidence viewer, and light print colors.
- Homepage checks at 320px, 768px and 1024px; reduced motion keeps the hero static while manual photo selection still works. No page-level horizontal overflow or uncaught browser exceptions were observed.

These checks use mock model results; they do not verify live model accuracy, live NWS availability, or real insurer acceptance. Browser screenshots showed NWS's existing unavailable-source fallback in this environment. No backend or model behavior was changed.

## Manual demo check

1. On a fresh visit, confirm the theme follows the OS. Toggle to the other theme, reload and navigate; the manual choice should persist.
2. Ask the assistant for a plan and resources. Select a map pin, inspect its source, and check the replay/hypothetical labels and emergency banner.
3. Select staged photos. Scan, edit and confirm an item; filter the review list and try manual merge/split if needed.
4. Open Memory Web. Use Tab and Enter on a suggestion; add photo evidence and confirm before it enters the claim.
5. Fetch price estimates. Check source links and download PDF, Excel and CSV. Confirm only approved inventory lines are included, then finish and delete the session.
6. Check a sourced safety branch, the product tour, privacy promises, and both Toolkit tabs. Print the insurer sheet while dark mode is selected; the print preview should remain light.
7. Repeat key actions at phone width with reduced motion enabled. Check that the bottom navigation and theme button remain reachable.

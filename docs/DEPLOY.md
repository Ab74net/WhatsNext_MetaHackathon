# Deploy the static concept

No deployment has been performed. No account connection, API key, environment variable, database, FastAPI service, serverless function, analytics, remote font, or map provider is needed. Publish **only `apps/web/out`**, never the repository root or `.env`. Use an HTTPS site served at its domain root.

## Prepare locally

1. Resolve the publication permissions recorded in [IMAGE_CREDITS.md](IMAGE_CREDITS.md). Attribution does not establish a licence. The six sample originals were supplied for the demo; file-level permission records still need confirmation.
2. In `apps/web/src/lib/demo/config.ts`, fill `DEMO_VIDEO_URL` with the unlisted YouTube link if desired. It becomes an ordinary click-to-open link, with no player, thumbnail request, or third-party connection by default. `GITHUB_URL` is already set to the repository.
3. Once you choose a domain or receive a host URL, set `SITE_URL` to its actual HTTPS origin and rebuild. Use just the origin, such as `https://your-domain.com`, with no subdirectory, credentials, query, or fragment. Until then, canonical URLs, sitemap entries, and social-image URLs are omitted. Each page gets its own canonical and social metadata when configured. A local 1200 × 630 social card is generated from the project's own wordmark/shapes, without third-party photography or remote fonts. The existing `icon.png` supplies the favicon.
4. Install Node 22.18+ (Node 24 is tested). From the repository root:

   ```sh
   npm run setup
   npm run test:web
   npm --prefix apps/web run lint
   npm run build
   # After setting SITE_URL, before publishing:
   npm run check:publish
   npm run test:demo
   npm run audit:repo
   npm run preview
   ```

5. Open `http://127.0.0.1:3000`. The preview serves only generated files; it starts no API. `test:demo` needs locally installed Chrome/Chromium, uses ports 3062/9252, and writes ignored screenshots/downloads to `scripts/out/demo-browser`. If Chrome is in a nonstandard path, `CHROME_PATH` is an optional **test-only** setting, never a deployment variable.

The build clears only the generated `.next`/`out` folders before exporting, avoiding stale Windows/OneDrive build entries. Generated `_headers` and `.nojekyll` are copied into the export. Rebuilding does not need private originals, saved model output, Python, or `.env`.

## Cloudflare Pages: static upload

1. Build locally using the steps above.
2. In Workers & Pages, create a **Pages** project and choose the direct upload option. Upload the contents of `apps/web/out` as the site root. Do not add Functions or a Worker.
3. After the host URL is assigned, set `SITE_URL`, rebuild, and upload the refreshed export before announcing it.
4. Check a direct visit to `/claims/`, `/about-demo/`, `/privacy/`, an unknown route, `/robots.txt`, and `/sitemap.xml`.

For repository builds, use repository root, install `npm --prefix apps/web ci`, build `npm run build`, and output `apps/web/out`. Select the static export framework option. [Cloudflare's static Next.js guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/) describes static export support. Check the plan's current limits before publishing; no paid runtime is part of this app.

## Netlify: manual static deploy

1. Build locally.
2. Create a manually deployed site and upload `apps/web/out` (its `index.html` belongs at the published root).
3. Set the assigned URL in `SITE_URL`, rebuild, and upload the refreshed folder.
4. The included `_headers` applies CSP and permission restrictions. No Next.js runtime plugin is required for this static upload.

If connecting the repo later, use the same install/build/output paths as above and select a static-site setup. [Netlify's framework overview](https://docs.netlify.com/build/frameworks/overview/) lists the static export output directory. Review current free-plan quotas; do not enable paid add-ons for the demo.

## Vercel: static project

1. Import the repository when ready to publish; choose `demo-mode` as the source branch if it has not been merged.
2. Keep the project root at the repository root. The included `vercel.json` selects **Other**, installs only frontend dependencies, builds the export, and publishes `apps/web/out`.
3. Add no environment variables, integrations, analytics, or runtime functions.
4. Set the assigned URL in `SITE_URL` and rebuild before announcing the site. Verify direct route loads and CSP.

`vercel.json` includes CSP, no-referrer, content-type, and camera/microphone/geolocation restriction headers. `_headers` is not a Vercel configuration file. The build verifies that Vercel's CSP stays aligned with `lib/demo/config.ts`. [Vercel's header configuration](https://vercel.com/docs/project-configuration/vercel-json#headers) documents how these apply to static files. Confirm that the intended use fits the current free plan.

## GitHub Pages: account-root site

This export uses root-relative assets. Use an account-root repository such as `Ab74net.github.io`, or a custom domain served at `/`. A project site under `/Meta2026Hackathon/` needs a separate base-path implementation; do not upload this build there unchanged.

1. Build the reviewed export locally.
2. In the account-root Pages repository, add the **contents** of `apps/web/out` to the publishing branch, including `.nojekyll` and `_next`.
3. In Settings → Pages, choose Deploy from a branch, select that branch and `/ (root)`.
4. Set its HTTPS origin in `SITE_URL`, rebuild, and replace the published artifact with the new contents.
5. Verify direct route loads, 404, and metadata. GitHub Pages cannot use `_headers`; the in-document CSP is the enforcement layer.

Alternatively prepare an Actions workflow that uploads `apps/web/out` with `actions/upload-pages-artifact` and publishes with `actions/deploy-pages`. No workflow is added here, so a commit cannot accidentally trigger publication. [GitHub's publishing-source guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) covers these options.

## CSP and privacy per host

The source of truth is `CSP` in `apps/web/src/lib/demo/config.ts`. Root layout emits it before application scripts on every route, including 404. `connect-src 'self'` permits only same-origin static files; no external host is allowlisted. Scripts/styles use self plus inline code for the static Next runtime, images use self/data/blob, frames/workers/objects are blocked, and form navigation is disabled. Scripted forms prevent submission and run locally.

Build preparation also emits `public/_headers` for Cloudflare/Netlify, adding `frame-ancestors 'none'`, camera/microphone/geolocation restrictions, and no-referrer. Vercel receives matching headers through `vercel.json`. GitHub Pages uses the meta CSP. No map tile-provider terms need acceptance because no map provider is used. Hosts may retain ordinary file access logs; the app has no analytics or input transmission.

## After buying the domain

Set `SITE_URL`, choose either the apex or `www` hostname as the primary origin in your host, and redirect the alternate hostname using that host's domain settings. Follow the host's instructions for connecting the domain and enabling HTTPS. No DNS changes are made by this repository. Set the unlisted YouTube link in `DEMO_VIDEO_URL` if you want it visible on About.

Run `npm run build` then `npm run check:publish`. The read-only check rejects blank/placeholder domains, stale canonical/social URLs, an incomplete sitemap, a missing social card, and an unsafe video-link scheme. It deliberately reports that publication is not configured while `SITE_URL` is empty; ordinary local builds still work without a domain. It does not deploy, verify DNS ownership, or establish photo permission.

## Pre-publish check

- Resolve image publication rights; review the visible `Meta Muse` partner text and the historical/disclaimer references listed in [DEMO_REVIEW.md](DEMO_REVIEW.md).
- Fill `SITE_URL`; optionally fill the video link; rebuild and inspect the generated social-image URL and sitemap.
- Run unit tests, lint, the static firewall, browser journey, and read-only history audit. Do not run the original paid model diagnostic.
- Check mobile navigation, keyboard tour/Escape, light/dark toggle, sample scan, confirmation, Memory Web, all three marked downloads, Aid checklist, Toolkit notes, and Reset demo.
- In browser DevTools, confirm requests go only to the site origin. External official links must open only when clicked. No permission prompt or file picker should be available.
- Open the agency links manually. Automated checks of `disasterassistance.gov`, `fema.gov`, and the FEMA declarations page returned HTTP 403 in this environment. [USAGov](https://www.usa.gov/disaster-assistance) independently identifies the official assistance application destination; endpoint accessibility still needs a normal-browser check.
- Keep program records dated and unverified. This conversion did not verify current eligibility, requirements, availability, declarations, or deadlines.

If a future audit identifies a real credential in history, revoke/rotate it with its provider first. Then coordinate history cleanup with collaborators using the provider's documented process. This work does not rewrite history.

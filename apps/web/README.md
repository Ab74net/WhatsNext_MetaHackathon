# Public concept frontend

Next.js/React interface for the project described in the [root README](../../README.md). It builds to a fully static `out` directory. The public entry point imports local fixtures only; no backend, API key, or environment file is needed.

From the repository root:

```sh
npm run setup
npm run dev
npm run build
npm run preview
npm run test:demo
```

See [demo internals](../../docs/DEMO_MODE.md), [deployment](../../docs/DEPLOY.md), and [review findings](../../docs/DEMO_REVIEW.md). Do not deploy FastAPI or use `next start` for this static export. `npm start` in this directory is a local static-file preview.

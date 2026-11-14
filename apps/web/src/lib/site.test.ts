import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSiteOrigin, pageMetadata, PUBLIC_PAGES, SOCIAL_IMAGE } from "./site.ts";

test("publication origin rejects placeholders, insecure URLs, credentials, and non-root sites", () => {
  assert.equal(normalizeSiteOrigin(""), "");
  assert.equal(normalizeSiteOrigin(" https://WhatNext-Demo.dev/ "), "https://whatnext-demo.dev");
  for (const url of ["http://whatnext-demo.dev", "https://example.com", "https://portfolio.example.org", "https://localhost", "https://127.0.0.1", "https://demo.test", "https://whatnext-demo.dev/site", "https://whatnext-demo.dev/?q=1", "https://whatnext-demo.dev/#home", "https://person:password@whatnext-demo.dev", "https://whatnext-demo.dev:3000"]) assert.throws(() => normalizeSiteOrigin(url), /SITE_URL/);
});
test("each page uses its own canonical and social URL, without inventing an unpublished origin", () => {
  for (const page of PUBLIC_PAGES) {
    const preview = pageMetadata(page.path, "");
    assert.equal(preview.alternates, undefined);
    assert.deepEqual(preview.openGraph?.images, []);
    const published = pageMetadata(page.path, "https://whatnext-demo.dev");
    assert.equal(published.alternates?.canonical, `https://whatnext-demo.dev${page.path}`);
    assert.equal(published.openGraph?.url, `https://whatnext-demo.dev${page.path}`);
    assert.match(JSON.stringify(published.openGraph?.images), new RegExp(SOCIAL_IMAGE.replace(".", "\\.")));
    assert.match(JSON.stringify(published.title), /concept demo/i);
  }
});

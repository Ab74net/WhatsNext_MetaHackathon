import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { HERO_IMAGES, ORIGINAL_HERO_IMAGES, heroSrc } from "./heroImages.ts";
import { INTRO_PHOTOS } from "./introPhotos.ts";

test("five new photographs precede the unchanged original sequence", () => {
  assert.deepEqual(INTRO_PHOTOS.map((p) => p.sourceFile), ["1.jpg", "2.jpg", "3.png", "4.jpg", "5.png"]);
  assert.deepEqual(HERO_IMAGES.slice(0, 5).map((p) => p.name), ["intro-1", "intro-2", "intro-3", "intro-4", "intro-5"]);
  assert.deepEqual(HERO_IMAGES.slice(5), ORIGINAL_HERO_IMAGES);
  assert.equal(HERO_IMAGES.length, 10);
  assert.equal(new Set(HERO_IMAGES.map((p) => p.name)).size, 10);
});
test("every slideshow source and srcset variant ships as a public asset", () => {
  for (const image of HERO_IMAGES) {
    assert.ok(existsSync(new URL(`../../public${heroSrc(image).src}`, import.meta.url)));
    for (const width of image.widths) assert.ok(existsSync(new URL(`../../public/hero/${image.name}-${width}.webp`, import.meta.url)));
  }
  const manifest = JSON.parse(readFileSync(new URL("../../public/hero/intro-manifest.json", import.meta.url), "utf8"));
  assert.deepEqual(manifest, INTRO_PHOTOS);
});

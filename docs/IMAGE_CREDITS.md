# Image credits

Homepage hero images live in `apps/web/public/hero/`. They were made from the originals in
`scripts/PicsForHomepagehackathon/` (git-ignored), resized to WebP, with all metadata
dropped. Alt text is in `apps/web/src/lib/heroImages.ts`.

> **Licence status: UNVERIFIED for every image below.** The filenames and metadata carry no
> author, agency or licence. Several look like news-wire photographs. Confirm a licence
> (or replace the image with a Muse Image render or a public-domain photo, such as a FEMA or
> NOAA photo) before the public submission.

| Hero file | Original | Edit | Source (from filename/metadata) | Licence |
| --- | --- | --- | --- | --- |
| `wildfire-*.webp` | `house1.png` | resize | none in metadata | unverified |
| `flood-750.webp` | `cf5f7232-18a8-4f14-8b95-d5b107baa531_750x422.png` | none (only 750 px wide, soft on large screens) | filename looks like a Substack image export | unverified |
| `hurricane-*.webp` | `downedpowerlines.png` | resize | none in metadata | unverified |
| `earthquake-*.webp` | `earthquake3.avif` | cropped to the building and sky, which removes the rescuers and a shop phone number | none in metadata | unverified |
| `tornado-*.webp` | `house3.png` | resize | none in metadata | unverified |

## New introductory sequence

The developer selected these five files in `scripts/photostoplayfirst/` for the first five slideshow positions. They are followed by all five original slides listed above. Source filenames establish a natural, deterministic order. The build helper writes resized WebPs with EXIF, GPS, XMP and embedded source metadata removed; raw originals are unchanged and excluded from Git.

| Order | Public prefix | Source | Preparation | Source / licence |
| --- | --- | --- | --- | --- |
| 1 | `intro-1-*.webp` | `1.jpg` | resize | developer-provided; licence not supplied |
| 2 | `intro-2-*.webp` | `2.jpg` | resize | developer-provided; licence not supplied |
| 3 | `intro-3-*.webp` | `3.png` | crop left foreground people, resize | developer-provided; licence not supplied |
| 4 | `intro-4-*.webp` | `4.jpg` | crop left foreground people, resize | developer-provided; licence not supplied |
| 5 | `intro-5-*.webp` | `5.png` | resize | developer-provided; licence not supplied |

The generation script is `scripts/prepare_intro_photos.py`; output metadata is recorded in `public/hero/intro-manifest.json` and `src/lib/introPhotos.ts`. No exact duplicate was found among the five new source images.

## Not used

| Original | Reason |
| --- | --- |
| `earhquake1.png` | identifiable people |
| `earthquake2.png` | identifiable people in the foreground |
| `flood1.png` | identifiable faces (rescue crew and passengers) |
| `flood2.png` | identifiable person, a likely victim standing in floodwater |
| `house4.png` | a person beside a house fully on fire (too graphic for this audience) |
| `house5.jpg` | identifiable people (Nikon D80 EXIF, 2011) |
| `house2.png` | active flames; too sensational next to a calmer aftermath image |
| `flood3.jpg` | actually a burned house, not a flood; iPhone EXIF suggests a personal photo; the wildfire slot is already filled |

## Our Story photographs

The developer supplied `scripts/nrv_photos/` as a collection from the 2024 New River Valley flooding. All four JPEGs were inspected. None has reliable EXIF location or capture-date metadata. Captions identify the collection generally and do not infer individual addresses, towns or dates. Source rights/photographer credits have not been supplied or verified.

| Public prefix | Original | Visible content | Preparation |
| --- | --- | --- | --- |
| `story/neighborhood-*.webp` | `3.jpg` | aerial view of floodwater around houses and streets | hero; resize only, original 4:3 ratio |
| `story/high-water-*.webp` | `2.jpg` | floodwater, camper and supermarket sign | gallery; resize only, original ratio |
| `story/aftermath-*.webp` | `4.jpg` | blue house, muddy street, damaged belongings and parked car | gallery; resize only, original 3:2 ratio |

`1.jpg` shows identifiable people wading through floodwater and is not used. `scripts/prepare_story_photos.py` generates responsive WebPs without EXIF/GPS/XMP/ICC metadata and a manifest. Raw originals are unchanged and ignored by Git.

## Wren mascot

| File | Source | Used on |
| --- | --- | --- |
| `wren/scene-checklist.webp` | Provided by the developer, Nov 2, 2026 (transparent PNG, specks removed, cropped) | Wren's empty chat; scan finished |
| `wren/scene-documents.webp` | Provided by the developer, Nov 2, 2026 | Toolkit: Documents |
| `wren/scene-guide.webp` | Provided by the developer, Nov 2, 2026 | Homepage "Meet Wren"; tour offer |
| `wren/scene-clipboard.webp` | Provided by the developer, Nov 2, 2026 | Toolkit: Insurer call |
| `wren/scene-scan.webp` | Provided by the developer, Nov 2, 2026 | Claims: scanning |
| `wren/idle.webp`, `thinking.webp`, `typing.webp`, `searching.webp`, `wren-hero.webp` | Earlier mascot set; source not recorded here | Round avatars (`wren-hero.webp` is no longer used) |

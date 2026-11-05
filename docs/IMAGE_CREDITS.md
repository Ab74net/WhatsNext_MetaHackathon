# Image credits and source research

Research date: **November 3, 2026 (US Eastern)**. All **22 supplied photographs** were
reverse-searched with Yandex Images, with the developer's permission. Responsive WebPs
are derivatives: **13 originals are used in the app; nine are unused**.

**Matching publications were located for 16 photographs. Six remain unresolved.**
A publication match does not necessarily identify the first publication or establish
permission to reuse the image. Credits below come from captions or embedded metadata.
Secondary-only matches are identified.

**Reuse status:** the unused `house5.jpg` has a verified **CC BY-SA 2.0** source.
No permission or open licence has been established for the other 21 photographs.
Agency/publisher attribution alone does not grant reuse rights.
Photos have been retained as requested. During the November 4 submission cleanup, the
Story page captions were corrected to use the researched locations and credits below;
the unresolved photograph is labeled with its location and photographer unverified.

## Important Story caption corrections

The folder name `nrv_photos` is not reliable location evidence:

- `3.jpg`, the Story hero, is **Ostrava, Czech Republic, September 17, 2024**,
  credited **David W Cerny / Reuters** in its original IPTC caption and matching
  [Weather Network coverage](https://www.theweathernetwork.com/en/news/weather/severe/deadly-floods-in-central-europe-swirl-towards-polands-historic-wroclaw).
- `2.jpg`, the supermarket/RV image, is **Morganton, North Carolina, September 28,
  2024**, credited **Kathy Kmonicek / AP** in the matching
  [Deseret News gallery](https://www.deseret.com/u-s-world/2024/09/30/helene-aftermath-photos/).
- `4.jpg` appears to show the same blue house as July 2023 reporting from **Second
  Street, Barre, Vermont**. This is a location lead, not an exact-photo attribution.

The Story page presents these as photographs of flooding and its aftermath, separately
from the developer's personal account of volunteering in the New River Valley.

## Original homepage hero photographs

Originals: `scripts/PicsForHomepagehackathon/`. Public files:
`apps/web/public/hero/`. Aid Autopilot also reuses the earthquake image.

| Public file | Original | Matching source and credit | Evidence / remaining gaps |
| --- | --- | --- | --- |
| `wildfire-*.webp` | `house1.png` | **Josh Edelson / AFP via Getty Images**. Pacific Palisades, January 8, 2025. [CBS gallery](https://www.cbsnews.com/news/palisades-fire-los-angeles-california-blazes-images/), [Commercial Observer](https://commercialobserver.com/2025/01/la-fires-rents-housing-apartment/). Getty **2192419743**. | **Exact image matched**: burned vehicle, Berkshire Hathaway wall and background. |
| `flood-750.webp` | `cf5f7232-18a8-4f14-8b95-d5b107baa531_750x422.png` | **Unresolved.** Flooded room, piano, fireplace, television and billiard light. | No exact match from reverse or filename searches. Results for Queens sewage flooding showed different photographs. |
| `hurricane-*.webp` | `downedpowerlines.png` | **Joe Raedle / Getty Images**. Hurricane **Laura**, Lake Charles, Louisiana, August 27, 2020. [The Atlantic, photo 1](https://www.theatlantic.com/photo/2020/08/photos-aftermath-hurricane-laura/615781/), [Telemundo gallery](https://www.telemundosanantonio.com/noticias/eeuu/en-fotos-laura-deja-cuantiosos-danos-en-lake-charles/2076640/). | **Exact image matched**. |
| `earthquake-*.webp` | `earthquake3.avif` | Full image appears in [Vietnam.vn / Tuoi Tre republication](https://www.vietnam.vn/tr/gan-100-tran-dong-dat-trong-mot-tuan-trai-dat-co-dang-rung-chuyen), credited there to **Reuters**. | **Exact image; secondary attribution only.** Original agency record, photographer, capture date and location remain unverified. Do not adopt the republication's event description without verification. |
| `tornado-*.webp` | `house3.png` | **Unresolved.** White two-story house, damaged tree and Woodhaven Avenue sign. | Inspected reverse-search results showed other houses. Photographer, event and licence unverified. |

Preparation: resize to WebP; earthquake cropped to the building and sky, excluding
foreground people and a shop phone number. Public derivatives have embedded metadata
removed. Raw originals are unchanged and ignored by Git. Alt text:
`apps/web/src/lib/heroImages.ts`.

## Introductory homepage photographs

Originals: `scripts/Photostoplayfirst/`. Public files: `apps/web/public/hero/intro-*`.

| Order / prefix | Original | Matching source and credit | Evidence / remaining gaps |
| --- | --- | --- | --- |
| 1 / `intro-1-*` | `1.jpg` | **Noah Berger / AP**. Park Fire, Highway 32, Forest Ranch, Butte County, California, July 25, 2024. [KPBS](https://www.kpbs.org/news/environment/2024/07/29/chula-vista-fire-department-sends-firefighters-to-park-fire). | **Embedded AP caption and matching publication**. AP ID `8f5d802f-91f8-4cf4-b3f0-06855d79c9e7`; friendly key `24208237523877`. |
| 2 / `intro-2-*` | `2.jpg` | **Ryan Kellman / NPR**. Eaton Fire aftermath, Altadena. [NPR photo essay](https://www.npr.org/2025/01/25/nx-s1-5257498/los-angeles-fire-eaton-home-belongings), [accessible MTPR republication](https://www.mtpr.org/2025-01-25/the-eaton-fire-forced-them-from-their-homes-heres-what-residents-took-with-them). Published January 25, 2025. | **Exact image matched** to NPR's `ev-1-2.jpg`. Publication date is not a verified capture date. |
| 3 / `intro-3-*` | `3.png` | **Alexey Golovshchikov / Reuters**. Tulun, Irkutsk Region, Russia, July 1, 2019. [The Atlantic, photo 33](https://www.theatlantic.com/photo/2019/07/photos-of-the-week-cool-pup-orion-launch-pitch-invader/593356/), [VOA gallery](https://www.voanews.com/a/july-4-2019-day-in-photos/4986829/p2.html). | **Exact image matched**, with a different crop around the tilted blue house. |
| 4 / `intro-4-*` | `4.jpg` | **Michael Swensen / Getty Images**. Sunshine Hills near London, Kentucky, May 2025. [NPR report via WHQR](https://www.whqr.org/national/2025-05-23/insurance-costs-are-soaring-around-tornado-alley-hail-is-the-big-problem). Getty **2215172473**. | **Exact image matched**; matching JPEG also names Swensen in metadata. |
| 5 / `intro-5-*` | `5.png` | [WRIC's Prince George house-fire report](https://www.wric.com/news/local-news/prince-george/large-house-fire-templeton-road/amp/); [WTVR coverage](https://www.wtvr.com/news/local-news/prince-george-county-house-fire-april-25-2025). Templeton Road, April 24, 2025. Coverage cites Prince George Fire and EMS. | **Exact image matched** to WRIC's published image. Photographer, image-supplier credit and reuse terms remain unverified; no public-domain status established. |

Preparation: images 1, 2 and 5 resized; images 3 and 4 cropped from the left to exclude
foreground people. `scripts/prepare_intro_photos.py` generates responsive WebPs,
`apps/web/public/hero/intro-manifest.json` and `apps/web/src/lib/introPhotos.ts`.

## Our Story photographs

Originals: `scripts/nrv_photos/`.

| Public prefix / use | Original | Matching source and credit | Evidence / remaining gaps |
| --- | --- | --- | --- |
| Unused | `1.jpg` | **Unresolved.** Five people wading beside a white pickup. | Similar flood-rescue photos were rejected. Location, capture date and author unverified. |
| `story/high-water-*` | `2.jpg` | **Kathy Kmonicek / AP**. Ingles parking lot, Morganton, North Carolina, September 28, 2024. [Deseret News](https://www.deseret.com/u-s-world/2024/09/30/helene-aftermath-photos/). | **Exact image matched**: two RVs, Ingles sign and Starbucks window. |
| `story/neighborhood-*` | `3.jpg` | **David W Cerny / Reuters**. Ostrava, Czech Republic, September 17, 2024. [The Weather Network](https://www.theweathernetwork.com/en/news/weather/severe/deadly-floods-in-central-europe-swirl-towards-polands-historic-wroclaw). | **Exact image and original IPTC caption matched**. Reuters transmission `LYNXMPEK8G0AM`; job `PPP-DWC09`. |
| `story/aftermath-*` | `4.jpg` | **Exact photograph unresolved.** Location lead: Second Street, Barre, Vermont. [VTDigger](https://vtdigger.org/2023/07/12/quite-an-incredible-sight-feds-survey-flood-damage-in-downtown-barre/), [Vermont Public](https://www.vermontpublic.org/local-news/2023-07-13/how-one-barre-vermont-neighborhood-is-trying-to-clean-up-after-chest-deep-floodwaters), [Green Up Vermont](https://greenupvermont.org/barre/) show the house/street from other angles. | **Location lead only.** Do not transfer Glenn Russell's or Peter Hirschfeld's credit from a different photograph. Exact author and date remain unverified. |

`scripts/prepare_story_photos.py` resizes the three used photos without cropping and
removes embedded metadata from derivatives. Outputs include
`apps/web/public/story/manifest.json` and `apps/web/src/lib/storyPhotos.ts`.
Raw originals are unchanged and ignored by Git.

## Unused original hero candidates

These eight files are not shipped as public app photographs, but were included in the search.

| Original | Matching source and credit | Evidence / reuse status |
| --- | --- | --- |
| `earhquake1.png` | **Jonathan Alpeyrie / Bloomberg via Getty Images**. Les Cayes, Haiti, August 15, 2021. [Getty image 1234703856](https://www.gettyimages.fi/detail/uutiskuva/residents-survey-a-damaged-building-following-a-7-2-uutiskuva/1234703856). | **Exact image matched**. Getty labels it rights-managed/editorial, with additional clearance for promotional/commercial use. |
| `earthquake2.png` | **Stoyan Nenov / Reuters**. Kahramanmaras, Turkey, February 8, 2023. [PBS News](https://www.pbs.org/newshour/world/death-toll-tops-11000-in-turkish-earthquake-as-freezing-temperatures-hamper-rescue-efforts). | **Exact image matched**; matching JPEG's IPTC names Nenov and Reuters. |
| `flood1.png` | **Andreas Solaro / AFP via Getty Images**. Lugo, Italy, May 18, 2023. [The Atlantic, photo 1](https://www.theatlantic.com/photo/2023/05/extreme-weather-flooding-northern-italy/674131/). | **Exact image matched**; matching JPEG's IPTC identifies photographer, agency, location and date. |
| `flood2.png` | **Hasnoor Hussain / Reuters**. Kangar, Malaysia, November 27, 2025. [Reuters gallery syndicated by Telegraph India, photo 2](https://www.telegraphindia.com/amp/gallery/thailand-shifts-gear-in-evacuation-efforts-as-floods-ease-deaths-climb-in-indonesia-photogallery-prnt/cid/2135070). | **Exact image matched**; matching JPEG's IPTC names Hussain and Reuters. |
| `flood3.jpg` | **Unresolved.** Burned building despite the flood filename. | Original EXIF: iPhone 11 Pro Max; capture timestamp `2021:04:06 13:41:41`. No author/location established. Metadata does not establish ownership; inspected search results showed different buildings. |
| `house2.png` | **Unresolved.** Burning residential building beside a tall hedge. | California wildfire coverage returned, but inspected images did not establish an exact match. |
| `house4.png` | **Mario Tama / Getty Images**. Eaton Fire, Altadena, January 8, 2025. [ABC News syndicated by KVNU](https://kvnutalk.com/california-fires-how-to-help-the-victims/). | **Exact image matched**: person using a garden hose beside the burning property. |
| `house5.jpg` | **Bob Herskovitz**, via **Heritage Preservation Department, Minnesota Historical Society**. Isanti County Historical Society fire aftermath, Cambridge, Minnesota. [Commons file record](https://commons.wikimedia.org/wiki/File:Recovery_after_2011_fire-Isanti_County_Historical_Society_Heritage_Center-07.jpg), [Flickr source](https://www.flickr.com/photos/52121299@N08/54166793381/). | **Exact match; CC BY-SA 2.0 verified** in Commons' Flickr licence review. EXIF capture: July 9, 2011; fire: July 8. Follow the [licence](https://creativecommons.org/licenses/by-sa/2.0/): attribution, licence link, indication of changes and applicable ShareAlike requirements. |

## Search method and unresolved originals

Yandex results were cross-checked with downloaded publication images, visible scene
details and retained EXIF/IPTC/XMP. Different crops were considered; similar scenes and
other photographs of the same house were not accepted as exact matches.
Google Lens showed a traffic challenge and Bing's upload failed, so neither produced
usable reverse-search results.

The six unresolved originals are:

1. `PicsForHomepagehackathon/cf5f7232-18a8-4f14-8b95-d5b107baa531_750x422.png` — **used**.
2. `PicsForHomepagehackathon/house3.png` — **used**.
3. `nrv_photos/4.jpg` — **used**; Barre location lead.
4. `nrv_photos/1.jpg` — unused.
5. `PicsForHomepagehackathon/house2.png` — unused.
6. `PicsForHomepagehackathon/flood3.jpg` — unused.

`earthquake3.avif` additionally needs its original agency record traced beyond the
matching secondary publication. Developer-supplied source/permission details can resolve
these gaps. No photographers or publishers were contacted.

## Wren mascot illustrations

These are illustrations, not photographs, and were outside this reverse-photo search.

| File | Source | Used on |
| --- | --- | --- |
| `wren/scene-checklist.webp` | Provided by the developer, Nov 2, 2026 (transparent PNG, specks removed, cropped) | Wren's empty chat; scan finished |
| `wren/scene-documents.webp` | Provided by the developer, Nov 2, 2026 | Toolkit: Documents |
| `wren/scene-guide.webp` | Provided by the developer, Nov 2, 2026 | Homepage "Meet Wren"; tour offer |
| `wren/scene-clipboard.webp` | Provided by the developer, Nov 2, 2026 | Toolkit: Insurer call |
| `wren/scene-scan.webp` | Provided by the developer, Nov 2, 2026 | Claims: scanning |
| `wren/idle.webp`, `thinking.webp`, `typing.webp`, `searching.webp`, `wren-hero.webp` | Earlier mascot set; source not recorded here | Round avatars (`wren-hero.webp` is no longer used) |

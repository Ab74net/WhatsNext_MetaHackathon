// Homepage hero images. Files live in public/hero/ as <name>-<width>.webp, made from the
// originals in scripts/PicsForHomepagehackathon (EXIF stripped, people cropped out).
// Credits and licence status: docs/IMAGE_CREDITS.md.
import { INTRO_PHOTOS } from "./introPhotos.ts";

export type HeroImage = {
  name: string;
  hazard: string;
  alt: string;
  widths: number[];
  /** 24 px wide, shown blurred until the real image arrives. */
  blur?: string;
};

export const ORIGINAL_HERO_IMAGES: HeroImage[] = [
  {
    name: "wildfire",
    hazard: "Wildfire",
    alt: "A street after a wildfire: a burned-out car and the shells of buildings under a smoky orange sky.",
    widths: [768, 1280, 1920],
    blur: "data:image/webp;base64,UklGRrgAAABXRUJQVlA4IKwAAADwAwCdASoYABAAPtFUo0uoJKMhsAgBABoJZgCdACHvXkDD420zp6BgAP60qVBw45xKlGmDLhEvxo5JyoZLh5W4wbI3Ihk5yz6nI5pP/qtp4H9x7htBnoLoWC/zAd9p/DltU3fOeOe8RKaRqh2w8PJiDsaLceon+YrkMntMDKz3XeUD5edEhrnARzjsegMow9kYJ6Llzfciv5FG/3GGxMDbWV1zdmQCaAnNDPQA",
  },
  {
    name: "flood",
    hazard: "Flood",
    alt: "A living room standing in brown floodwater, with belongings floating near the fireplace.",
    widths: [750],
    blur: "data:image/webp;base64,UklGRrAAAABXRUJQVlA4IKQAAABQBACdASoYAA4APtFUo0uoJKMhsAgBABoJQBOmUAnANpifwvNMupzcMx+AAP4G6cdvNTVisbsE8UcxhdSf00zPdxQMr5F7mj9d5SnIFE5MIyjCazbIqx1s9Q+r06TDOaFqkD70TvHiMiNr/MxR/N2Rsf74tnZI24naY4s/A+SIYTIn5CgYG+Xyx1Jyqp+xzPzSvlk4Bt0LPLXsGSKUwnqkWAAAAA==",
  },
  {
    name: "hurricane",
    hazard: "Hurricane",
    alt: "Power poles snapped and leaning across an empty street after a hurricane.",
    widths: [768, 1280, 1920],
    blur: "data:image/webp;base64,UklGRpgAAABXRUJQVlA4IIwAAAAQBQCdASoYABEAPtFWpE0oJCMiMBgIAQAaCWcAtOgQzBnUwRLMWpDmmF2rKUTR58pAAPxSft+46ElzEE17bfWLzy/Wf5UCNSSpuS2HAUWylc2CHClLIRMBXK+HWAnVLfpbLGaLqpQpUd4w9n3cl/CrMuFEnsR66Vv1yhmugw8iI4Y2mI0zOc5R+/IAAA==",
  },
  {
    name: "earthquake",
    hazard: "Earthquake",
    alt: "A four-story building tilted and partly collapsed after an earthquake.",
    widths: [768, 1280],
    blur: "data:image/webp;base64,UklGRp4AAABXRUJQVlA4IJIAAABQBACdASoYAAwAPtFUo0uoJKMhsAgBABoJagCdAYwmufX7oIXOnQOkTeToAP7Tm5sxw6/elN4WzTpDiZ7n1dsXYQILv3l1VCzRw6mBz3MPiQ/sC+IHBJAYKzd+lN/W0zkIjC548itDC8ta+D1zXKeA4lIoA10DN7l0uIOU3+fe0nyya9p3FSZPjj+/i4OTrXAAAA==",
  },
  {
    name: "tornado",
    hazard: "Tornado",
    alt: "A white two-story house with a torn roof beside a split tree after a tornado.",
    widths: [768, 1280, 1920],
    blur: "data:image/webp;base64,UklGRrwAAABXRUJQVlA4ILAAAAAwBQCdASoYABEAPtFcp04oJSOiKAqpABoJYgCsL8CApvZ0mf307mzAJrvI64IImahcAAD+zdDIiYoKuZxkZmKkXYz5nbaPNtmUL5TwyOptGjvXWMlih3yc8/py29hJ/a1h/R/zusjxWIxQF6p9/xUcIeUwoDAZOSIevPrcvf+BJ5eAsqEaUaHMRQImlb3EHsmWeCJMum+IyP08yF9XaSd0gzHMkB9sCez3QQ4MRqFcAA==",
  },
];

// Deterministic natural source order first, then every original slide in its existing order.
export const HERO_IMAGES: HeroImage[] = [...INTRO_PHOTOS, ...ORIGINAL_HERO_IMAGES];

export function heroSrc(img: HeroImage) {
  const largest = img.widths[img.widths.length - 1];
  return {
    src: `/hero/${img.name}-${img.widths.includes(1280) ? 1280 : largest}.webp`,
    srcSet: img.widths.map((w) => `/hero/${img.name}-${w}.webp ${w}w`).join(", "),
  };
}

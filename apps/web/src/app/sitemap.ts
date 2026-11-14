import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/demo/config";
import { normalizeSiteOrigin, PUBLIC_PAGES } from "@/lib/site";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  // No fabricated origin or localhost URLs. Fill SITE_URL before publishing.
  const origin = normalizeSiteOrigin(SITE_URL);
  return origin ? PUBLIC_PAGES.map(page => ({ url: new URL(page.path, origin).href })) : [];
}

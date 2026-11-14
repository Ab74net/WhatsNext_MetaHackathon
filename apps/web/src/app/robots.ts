import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/demo/config";
import { normalizeSiteOrigin } from "@/lib/site";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  const origin = normalizeSiteOrigin(SITE_URL);
  return { rules: { userAgent: "*", allow: "/" }, ...(origin ? { sitemap: new URL("/sitemap.xml", origin).href } : {}) };
}

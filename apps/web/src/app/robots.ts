import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/demo/config";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, ...(SITE_URL ? { sitemap: new URL("/sitemap.xml", SITE_URL).href } : {}) };
}

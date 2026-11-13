import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/demo/config";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  // No fabricated origin or localhost URLs. Fill SITE_URL before publishing.
  return SITE_URL ? ["/", "/agent/", "/claims/", "/aid/", "/toolkit/", "/our-story/", "/about-demo/", "/privacy/"].map(path => ({ url: new URL(path, SITE_URL).href })) : [];
}

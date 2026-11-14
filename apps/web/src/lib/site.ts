import type { Metadata } from "next";
import brand from "../../../../packages/shared/brand.json" with { type: "json" };
import { SITE_URL } from "./demo/config.ts";

export const SOCIAL_IMAGE = "/social-card.png";
export const SITE_DESCRIPTION = "An independent disaster recovery concept with sample photos, simulated inventories, and scripted responses. No uploads or live AI.";
export const PUBLIC_PAGES = [
  { path: "/", title: "Home", description: SITE_DESCRIPTION },
  { path: "/agent/", title: "Sample assistant", description: "Explore scripted recovery prompts, fictional map places, example plans, and dated safety walkthroughs. No live chat or current alerts." },
  { path: "/claims/", title: "Sample inventory", description: "Choose supplied photos, review precomputed detections, explore Memory Web, and export a clearly marked sample inventory." },
  { path: "/aid/", title: "Aid Autopilot", description: "A concept demonstration of local assistance matching and preparation checklists. Sample data only; eligibility is not determined." },
  { path: "/toolkit/", title: "Recovery Toolkit", description: "Explore static document replacement guidance and example insurer-call preparation. Notes stay in your browser." },
  { path: "/our-story/", title: "Our Story", description: `The volunteering experience during the 2024 New River Valley floods that inspired ${brand.projectName}, an independent recovery concept.` },
  { path: "/about-demo/", title: "About this demo", description: "The story, original hackathon technology, and limits of this independent simulated disaster recovery concept." },
  { path: "/privacy/", title: "Privacy", description: "No photos, live AI, analytics, or server-side input storage. Learn how local demo progress and Reset demo work." },
] as const;

export function normalizeSiteOrigin(value: string): string {
  const input = value.trim();
  if (!input) return "";
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("SITE_URL must be an HTTPS origin such as https://your-domain.com."); }
  if (/\s|\\/.test(input) || url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash
    || !url.hostname.includes(".") || /(^|\.)(localhost|local|invalid|test|example)$/.test(url.hostname)
    || /(^|\.)example\.(com|net|org)$/.test(url.hostname) || /^\d+(?:\.\d+){3}$/.test(url.hostname)) {
    throw new Error("SITE_URL must be your real HTTPS domain only, without credentials, a port, path, query, fragment, or placeholder hostname.");
  }
  return url.origin;
}

export function pageMetadata(path: string, siteUrl = SITE_URL): Metadata {
  const page = PUBLIC_PAGES.find(page => page.path === path);
  if (!page) throw new Error(`No public page metadata for ${path}`);
  const origin = normalizeSiteOrigin(siteUrl);
  const title = path === "/" ? `${brand.projectName} | Concept demo` : `${page.title} | ${brand.projectName} concept demo`;
  return {
    title: { absolute: title }, description: page.description,
    ...(origin ? { metadataBase: new URL(origin), alternates: { canonical: new URL(path, origin).href } } : {}),
    openGraph: { title, description: page.description, type: "website",
      ...(origin ? { url: new URL(path, origin).href } : {}),
      images: origin ? [{ url: new URL(SOCIAL_IMAGE, origin).href, width: 1200, height: 630, alt: `${brand.projectName} - independent concept demo` }] : [],
    },
    twitter: { card: "summary_large_image", title, description: page.description, images: origin ? [new URL(SOCIAL_IMAGE, origin).href] : [] },
  };
}

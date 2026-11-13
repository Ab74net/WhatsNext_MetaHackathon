import type { Metadata, Viewport } from "next";
import brand from "@shared/brand.json";
import { AppShell } from "@/components/AppShell";
import { THEME_BOOTSTRAP } from "@/lib/theme";
import { CSP, SITE_URL } from "@/lib/demo/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${brand.projectName} | Concept demo`, template: `%s | ${brand.projectName} concept demo` },
  description: `${brand.projectName} is an independent disaster recovery concept with sample photos, simulated inventories, and scripted responses. No uploads or live AI.`,
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  openGraph: {
    title: `${brand.projectName} | Concept demo`,
    description: "Explore a simulated disaster recovery workflow. Sample data only; no uploads or live AI.",
    type: "website",
    images: SITE_URL ? [{ url: new URL("/hero/intro-2-1100.webp", SITE_URL).href, width: 1100, height: 733, alt: "Belongings after a disaster; independent recovery concept demo" }] : [],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // React's local development debugging needs eval; exported pages never allow it.
  const pageCsp = process.env.NODE_ENV === "development" ? CSP.replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'") : CSP;
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className="h-full">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={pageCsp} />
        <meta name="referrer" content="no-referrer" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

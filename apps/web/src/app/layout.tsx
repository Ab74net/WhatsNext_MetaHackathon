import type { Metadata, Viewport } from "next";
import brand from "@shared/brand.json";
import { AppShell } from "@/components/AppShell";
import { THEME_BOOTSTRAP } from "@/lib/theme";
import { CSP, SITE_URL } from "@/lib/demo/config";
import { normalizeSiteOrigin, pageMetadata, SITE_DESCRIPTION } from "@/lib/site";
import "./globals.css";

const siteOrigin = normalizeSiteOrigin(SITE_URL);
const sharing = pageMetadata("/");
export const metadata: Metadata = {
  title: { default: `${brand.projectName} | Concept demo`, template: `%s | ${brand.projectName} concept demo` },
  description: SITE_DESCRIPTION,
  ...(siteOrigin ? { metadataBase: new URL(siteOrigin) } : {}),
  openGraph: sharing.openGraph,
  twitter: sharing.twitter,
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

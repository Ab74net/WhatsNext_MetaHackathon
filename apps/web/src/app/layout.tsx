import type { Metadata, Viewport } from "next";
import brand from "@shared/brand.json";
import { AppShell } from "@/components/AppShell";
import { THEME_BOOTSTRAP } from "@/lib/theme";
import { CSP } from "@/lib/demo/config";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.projectName,
  description: `${brand.projectName}: disaster recovery help and a claims inventory from your photos.`,
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className="h-full">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
        <meta name="referrer" content="no-referrer" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

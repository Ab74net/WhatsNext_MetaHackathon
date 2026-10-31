import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import brand from "@shared/brand.json";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: brand.projectName,
  description: `${brand.projectName}: disaster recovery help and a claims inventory from your photos.`,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1311" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>
          <div className="flex-1 flex flex-col">{children}</div>
          <footer className="px-4 py-4 text-center text-xs text-muted">
            {brand.projectName} gives general guidance only. It is not insurance or legal advice.
          </footer>
        </AppShell>
      </body>
    </html>
  );
}

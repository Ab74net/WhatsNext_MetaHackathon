import type { Metadata, Viewport } from "next";
import { Geist_Mono, Public_Sans, Source_Serif_4 } from "next/font/google";
import brand from "@shared/brand.json";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

// UI text: Public Sans (a civic typeface). Headings: Source Serif 4.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
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
  themeColor: "#131210",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${publicSans.variable} ${sourceSerif.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

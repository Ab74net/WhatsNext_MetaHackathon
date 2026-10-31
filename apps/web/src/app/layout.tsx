import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import brand from "@shared/brand.json";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex-1 flex flex-col">{children}</div>
        <footer className="px-4 py-3 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
          {brand.projectName} gives general guidance only. It is not insurance or legal advice. In an
          emergency, call 911.
        </footer>
      </body>
    </html>
  );
}

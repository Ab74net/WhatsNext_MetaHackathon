"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, FolderCheck, House, MessageCircle, Package, Phone } from "lucide-react";
import brand from "@shared/brand.json";
import { TourProvider, useTour } from "@/components/tour/Tour";

const NAV = [
  { href: "/agent", label: brand.agentName, icon: MessageCircle },
  { href: "/claims", label: "My Claim", icon: Package },
  { href: "/toolkit", label: "Toolkit", icon: FolderCheck },
];
const MOBILE_NAV = [{ href: "/", label: "Home", icon: House }, ...NAV];

// Top bar with text links on desktop, bottom tab bar on phones. The 911 link is always visible,
// and the "not insurance or legal advice" note sits at the foot of every page.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <TourProvider>
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Mark />
            <span className="truncate font-display text-[17px] font-bold tracking-tight">
              {brand.projectName}<span className="hidden font-medium text-muted sm:inline"> × {brand.partner}</span>
            </span>
          </Link>

          <nav className="ml-auto hidden h-full items-center gap-7 md:flex" aria-label="Main">
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
                className={`relative flex h-full items-center text-sm font-medium transition-colors ${
                  active(href) ? "text-ink" : "text-muted hover:text-ink"}`}>
                {label}
                {active(href) && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden />}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 md:ml-6">
            <TourLink />
            <a href="tel:911" data-tour="call-911"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold text-danger transition-colors hover:bg-danger-soft">
              <Phone className="size-3.5" aria-hidden /> Call 911
            </a>
            <Link href="/agent" className="hidden h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-[#2b2b2b] sm:inline-flex">
              Get help
            </Link>
          </div>
        </div>
      </header>

      <main className="flex min-w-0 flex-1 flex-col">{children}</main>

      <footer className="border-t border-line px-4 pb-24 pt-5 text-center text-xs text-subtle md:pb-5">
        General guidance only. Not insurance or legal advice. Every source shows when it was last checked.
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active(href) ? "text-accent" : "text-muted"}`}>
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
    </TourProvider>
  );
}

// Replays the guided tour. Text on wider screens, icon only on phones.
function TourLink() {
  const { start } = useTour();
  return (
    <button type="button" onClick={start} aria-label="Take a tour" data-tour-link
      className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted hover:bg-surface-2 hover:text-ink">
      <Compass className="size-4" aria-hidden />
      <span className="hidden lg:inline">Take a tour</span>
    </button>
  );
}

// Three stacked stones: a trail marker. (Not a sparkle.)
function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden className="shrink-0 text-ink">
      <ellipse cx="12" cy="19" rx="8.5" ry="3.3" fill="currentColor" />
      <ellipse cx="12" cy="12.6" rx="6" ry="2.8" fill="var(--deco-coral)" />
      <ellipse cx="12" cy="6.9" rx="3.6" ry="2.2" fill="var(--deco-blue)" />
    </svg>
  );
}

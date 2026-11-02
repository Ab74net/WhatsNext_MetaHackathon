"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, House, MessageCircle, Package, Phone, ShieldCheck } from "lucide-react";
import brand from "@shared/brand.json";
import { TourProvider, useTour } from "@/components/tour/Tour";

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/agent", label: `Ask ${brand.agentName}`, short: "Assistant", icon: MessageCircle },
  { href: "/claims", label: "Claim inventory", short: "Inventory", icon: Package },
];

// Top bar + left sidebar on desktop, bottom tab bar on phones. The 911 link is always visible.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <TourProvider>
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 h-14 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex h-full items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="text-[17px] font-bold tracking-tight">{brand.projectName}</span>
          </Link>
          <span className="ml-1 hidden items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-xs font-medium text-muted md:inline-flex">
            <ShieldCheck className="size-3.5 text-good" aria-hidden />
            Private session · nothing stored
          </span>
          <TourLink />
          <a href="tel:911" data-tour="call-911"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-danger-soft px-3 text-[13px] font-semibold text-danger hover:brightness-95">
            <Phone className="size-3.5" aria-hidden />
            Emergency? Call 911
          </a>
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="sticky top-14 hidden h-[calc(100dvh_-_3.5rem)] w-60 shrink-0 flex-col gap-1 p-3 lg:flex" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors ${
                active(href) ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface-3/60"}`}>
              <span className={`flex size-8 items-center justify-center rounded-full ${active(href) ? "bg-accent text-accent-ink" : "bg-surface-3"}`}>
                <Icon className="size-[18px]" aria-hidden />
              </span>
              {label}
            </Link>
          ))}
          <p className="mt-auto px-3 text-xs leading-relaxed text-subtle">
            General guidance only. Not insurance or legal advice. Every source shows when it was last checked.
          </p>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface lg:hidden" aria-label="Main">
        {NAV.map(({ href, label, short, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 pb-2 pt-1.5 text-[11px] font-medium ${active(href) ? "text-accent" : "text-muted"}`}>
            <span className={`h-0.5 w-8 rounded-full ${active(href) ? "bg-accent" : "bg-transparent"}`} />
            <Icon className="mt-1 size-5" aria-hidden />
            {short ?? label}
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
      className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-muted hover:text-ink">
      <Compass className="size-4" aria-hidden />
      <span className="hidden sm:inline">Take a tour</span>
    </button>
  );
}

// Three stacked stones: a trail marker.
function Mark() {
  return (
    <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-ink">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <ellipse cx="12" cy="18.5" rx="8" ry="3.2" fill="currentColor" />
        <ellipse cx="12" cy="12.4" rx="5.6" ry="2.7" fill="currentColor" opacity="0.85" />
        <ellipse cx="12" cy="6.8" rx="3.4" ry="2.1" fill="currentColor" opacity="0.7" />
      </svg>
    </span>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, FolderCheck, House, LifeBuoy, MessageCircle, Network, Package, Phone, ShieldCheck } from "lucide-react";
import brand from "@shared/brand.json";
import { TourProvider, useTour } from "@/components/tour/Tour";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MotionConfig } from "motion/react";
import { AidProvider } from "@/components/aid/AidProvider";
import { replaceHash, useLocationHash } from "@/lib/useLocationHash";

const NAV = [
  { href: "/agent", label: brand.agentName, icon: MessageCircle },
  { href: "/claims", label: "My Claim", icon: Package },
  { href: "/claims#memory", label: "Memory Web", icon: Network },
  { href: "/aid", label: "Aid Autopilot", icon: LifeBuoy },
  { href: "/#privacy", label: "Privacy", icon: ShieldCheck },
];
const MOBILE_NAV = [{ href: "/", label: "Home", icon: House }, ...NAV.slice(0, 2), { href: "/aid", label: "Aid", icon: LifeBuoy }, { href: "/toolkit", label: "Toolkit", icon: FolderCheck }];

// Top bar with text links on desktop, bottom tab bar on phones. The 911 link is always visible,
// and the "not insurance or legal advice" note sits at the foot of every page.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hash = useLocationHash();
  const active = (href: string) => href.includes("#") ? `${pathname}${hash}` === href
    : href === "/" ? pathname === "/" && !hash : pathname.startsWith(href) && hash !== "#memory";

  return (
    <TourProvider>
    <AidProvider>
    <MotionConfig reducedMotion="user">
    <div className="app-shell flex min-h-dvh flex-col">
      <a href="#main-content" className="fixed -top-20 left-4 z-50 rounded-full bg-primary px-5 py-3 text-primary-ink focus:top-3">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas">
        <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-8 lg:px-10">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Mark />
            <span className="truncate font-display text-lg font-bold tracking-tight lg:text-[23px]">
              {brand.projectName}<span className="hidden sm:inline lg:hidden xl:inline"> × {brand.partner}</span>
            </span>
          </Link>

          <nav className="ml-auto hidden h-full items-center gap-4 lg:flex xl:gap-6" aria-label="Main">
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
                onClick={(event) => { if (href.includes("#") && href.split("#")[0] === pathname) { event.preventDefault(); replaceHash(`#${href.split("#")[1]}`); } }}
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
            <ThemeToggle />
            <Link href="/agent" className="hidden h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-ink hover:bg-primary-hover sm:inline-flex">
              Get help
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="app-content flex min-w-0 flex-1 flex-col">
        <span aria-hidden className="page-decoration page-decoration-blue" />
        <span aria-hidden className="page-decoration page-decoration-coral" />
        {children}
      </main>

      <footer className="border-t border-line px-4 pb-24 pt-5 text-center text-xs text-subtle lg:pb-5">
        <div className="mb-3 flex flex-wrap justify-center gap-5 text-[13px] font-medium text-ink">
          <Link href="/#privacy" className="hover:underline">Privacy</Link>
          <Link href="/toolkit" className="hover:underline">Recovery toolkit</Link>
          <Link href="/aid" className="hover:underline">Aid Autopilot</Link>
          <TourLink footer />
          <a href="tel:911" className="text-danger hover:underline">In danger? Call 911.</a>
        </div>
        General guidance only. Not insurance or legal advice. Every source shows when it was last checked.
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active(href) ? "text-accent" : "text-muted"}`}>
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
    </MotionConfig>
    </AidProvider>
    </TourProvider>
  );
}

// Replays the guided tour. Text on wider screens, icon only on phones.
function TourLink({ footer = false }: { footer?: boolean }) {
  const { start } = useTour();
  return (
    <button type="button" onClick={start} aria-label="Take a tour" data-tour-link
      className={`${footer ? "inline-flex" : "hidden sm:inline-flex"} min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted hover:bg-surface-2 hover:text-ink`}>
      <Compass className="size-4" aria-hidden />
      <span className={footer ? "" : "hidden 2xl:inline"}>Take a tour</span>
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

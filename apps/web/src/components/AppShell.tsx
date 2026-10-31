"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import brand from "@shared/brand.json";

const NAV = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/agent", label: "Assistant", icon: ChatIcon },
  { href: "/claims", label: "Inventory", icon: BoxIcon },
];

// Top bar on desktop, bottom tab bar on phones. The 911 link is always visible.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Mark />
            {brand.projectName}
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  active(href) ? "bg-accent-soft text-accent font-medium" : "text-muted hover:text-ink"}`}>
                {label}
              </Link>
            ))}
          </nav>
          <a href="tel:911"
            className="ml-auto rounded-full border border-danger/40 px-3 py-1 text-xs font-medium text-danger hover:bg-danger/10">
            Emergency? Call 911
          </a>
        </div>
      </header>

      <div className="flex flex-1 flex-col pb-16 sm:pb-0">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface sm:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active(href) ? "text-accent" : "text-muted"}`}>
            <Icon />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}

// Three stacked stones: a trail marker.
function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="text-accent">
      <ellipse cx="12" cy="19" rx="8" ry="3.2" fill="currentColor" />
      <ellipse cx="12" cy="12.6" rx="5.6" ry="2.7" fill="currentColor" opacity="0.8" />
      <ellipse cx="12" cy="7" rx="3.4" ry="2.1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 5h16v11H8l-4 4z" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10" />
    </svg>
  );
}

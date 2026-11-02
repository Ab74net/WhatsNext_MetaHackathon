// Shared UI primitives. Every screen builds from these so spacing, radius and color
// stay consistent; change a style here, not in individual pages.

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover",
  secondary: "bg-surface-3 text-ink hover:brightness-95 dark:hover:brightness-110",
  ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger-soft text-danger hover:brightness-95",
  success: "bg-good text-white hover:brightness-95",
};
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className = "") {
  return `inline-flex shrink-0 items-center justify-center rounded-lg font-semibold transition
    disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export function Button({ variant = "secondary", size = "md", loading = false, className = "", children, disabled, ...props }:
  ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button {...props} disabled={disabled || loading} className={buttonClass(variant, size, className)}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "secondary", size = "md", className = "", ...props }:
  ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}

export function Card({ className = "", children, ...props }: ComponentProps<"div">) {
  return <div {...props} className={`rounded-xl bg-surface shadow-card ${className}`}>{children}</div>;
}

type Tone = "neutral" | "accent" | "good" | "warn" | "danger";
const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  accent: "bg-accent-soft text-accent",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", icon, children, className = "" }:
  { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

export function ProgressBar({ value, tone = "accent", className = "" }: { value: number; tone?: "accent" | "good"; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-surface-3 ${className}`} role="progressbar"
      aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-[width] duration-500 ${tone === "good" ? "bg-good" : "bg-accent"}`}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      <span className="text-2xl font-bold tracking-tight tabular-nums">{value}</span>
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted">{icon}</div>
      <p className="font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "neutral", icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 text-sm ${TONES[tone]}`}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1">{children}</div>
    </div>
  );
}

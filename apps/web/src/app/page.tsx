import Link from "next/link";
import brand from "@shared/brand.json";

// Placeholder homepage; the cinematic hero is Phase 6.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <p className="text-sm uppercase tracking-widest text-zinc-500">{brand.projectName}</p>
      <h1 className="text-4xl font-semibold tracking-tight">{brand.tagline}</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Rebuild your home inventory from the photos you already have, one confirmed item at a time.
      </p>
      <Link
        href="/claims"
        className="rounded-full bg-foreground px-6 py-3 font-medium text-background hover:opacity-90"
      >
        Start your inventory
      </Link>
    </main>
  );
}

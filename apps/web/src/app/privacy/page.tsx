import { pageMetadata } from "@/lib/site";
import Link from "next/link";
export const metadata = pageMetadata("/privacy/");
export default function Privacy() {
  return <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-12">
    <h1 className="page-title">Privacy in this demo</h1>
    <p>This public concept accepts no photos, runs no AI, and has no chat or application server. Free text is matched locally to scripted examples and is never transmitted. Nothing you enter is stored on a server.</p>
    <p>Sample inventory edits, theme preferences, Toolkit notes, and tour preferences can be saved only in this browser&apos;s local storage. The scripted conversation uses this tab&apos;s session storage. Aid details and draft checklists stay in memory until you reload. If storage is blocked, the demo uses memory where possible.</p>
    <p>Use <strong>Reset demo</strong> in the banner to clear this app&apos;s saved browser state and reload. Browser-only state is the sole exception to the banner&apos;s &ldquo;nothing is saved&rdquo; shorthand. No analytics, tracking cookies, remote fonts, map tiles, microphone, camera, or location permissions are used.</p>
    <p>Your browser still requests the site&apos;s static files from the hosting provider. The app adds no request payloads containing your input. The host may keep ordinary access logs under its own policy; the app cannot control those. External links open only when clicked and follow the destination&apos;s privacy policy.</p>
    <p>Use example details. Never enter your Social Security number, policy number, or other sensitive information.</p>
    <Link href="/about-demo" className="font-semibold text-blue underline">About this demo</Link>
  </article>;
}

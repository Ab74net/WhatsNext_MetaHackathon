import { pageMetadata } from "@/lib/site";
import brand from "@shared/brand.json";
import { DEMO_VIDEO_URL, GITHUB_URL } from "@/lib/demo/config";
import { ButtonLink } from "@/components/ui";
import { EmergencyNotice } from "@/components/EmergencyNotice";
export const metadata = pageMetadata("/about-demo/");

export default function AboutDemo() {
  return <article className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-5 py-12">
    <header><p className="page-eyebrow">Independent concept project</p><h1 className="page-title mt-3">About this demo</h1></header>
    <EmergencyNotice />
    <p>{brand.projectName} is a concept built solo by Ashraf A., a Virginia Tech student, for the Meta Global AI Developer Hackathon, indie track. It grew from volunteering during the 2024 New River Valley floods and seeing how hard it was for residents to remember the belongings they lost.</p>
    <section><h2 className="mb-3 text-2xl">What the original prototype did</h2><p>The original version used Meta’s Muse Spark vision-language model and SAM 3.1 segmentation to identify and outline belongings in selected photos. {brand.agentName}, its assistant, returned maps, sourced cards, and recovery plans. People reviewed and confirmed each item before exporting an inventory.</p></section>
    <section><h2 className="mb-3 text-2xl">What this public version does</h2><p>This version uses supplied sample photos, precomputed detections, fictional map places, frozen sample alerts, and scripted responses. No photos are accepted, no AI runs, and no real chat or backend is needed. Your text stays in the browser. Local demo progress is clearable with Reset demo. No analytics, cookies, or trackers are added by the app.</p></section>
    <section><h2 className="mb-3 text-2xl">How it would work in production</h2><ol className="list-decimal space-y-3 pl-5"><li>Use a privacy-first, opt-in session for selected photos.</li><li>Process photos per session, remove embedded location metadata, and delete session photos when finished.</li><li>Ask the person to review and confirm every item. Label estimates and retain evidence links.</li><li>Use current official program sources and clearly dated safety information. Keep application submission under the person’s control.</li></ol></section>
    <section className="rounded-3xl border border-line bg-surface p-6"><h2 className="mb-4 text-2xl">See the project</h2><div className="flex flex-wrap gap-4">{DEMO_VIDEO_URL ? <a href={DEMO_VIDEO_URL} target="_blank" rel="noreferrer" className="font-semibold text-blue underline">Watch the original demo video</a> : <span className="text-sm text-muted">Demo video link coming soon.</span>}<a href={GITHUB_URL} target="_blank" rel="noreferrer" className="font-semibold text-blue underline">View the source on GitHub</a></div><p className="mt-3 text-xs text-muted">No third-party video player loads on this page. External destinations open only when you choose a link.</p></section>
    <p className="border-t border-line pt-6 text-sm text-muted">Independent concept project. Not affiliated with or endorsed by Meta, FEMA, or any insurer. Not insurance or legal advice.</p>
    <ButtonLink href="/claims">Explore the sample inventory</ButtonLink>
  </article>;
}

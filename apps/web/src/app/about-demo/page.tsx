import brand from "@shared/brand.json";
import { ButtonLink } from "@/components/ui";

export default function AboutDemo() {
  return <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-12"><h1 className="page-title">About this demo</h1>
    <p>{brand.projectName} is an independent disaster recovery concept. This public version uses sample photos, precomputed results, and scripted responses. It runs in your browser without a backend.</p>
    <p>Your input is never sent. Optional demo progress is kept only in your browser and can be cleared with Reset demo. No analytics, cookies, or trackers are used.</p>
    <p>Independent concept project. Not affiliated with or endorsed by Meta, FEMA, or any insurer. Not insurance or legal advice.</p>
    <ButtonLink href="/">Explore the concept</ButtonLink>
  </article>;
}

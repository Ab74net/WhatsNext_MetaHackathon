import type { Metadata } from "next";
import { ArrowDown, ArrowRight, Check, Compass, Images, ListChecks, MapPin, Search } from "lucide-react";
import brand from "@shared/brand.json";
import { ButtonLink } from "@/components/ui";
import { StoryReveals } from "@/components/story/StoryReveals";
import { STORY_PHOTOS } from "@/lib/storyPhotos";
import "./story.css";

export const metadata: Metadata = {
  title: `Our Story · ${brand.projectName}`,
  description: `A Virginia Tech student's experience of the 2024 New River Valley floods, and the idea behind ${brand.projectName}.`,
};

const PROBLEMS = [
  { icon: Images, title: "Remembering what was lost", body: "An insurance claim can mean listing hundreds of belongings, often without an inventory prepared beforehand." },
  { icon: Search, title: "Finding the right help", body: "Relief programs, temporary housing and official resources are scattered across different websites." },
  { icon: Compass, title: "Knowing where to begin", body: "In a stressful moment, a clear next step can be more useful than another page of information." },
];

function StoryPhoto({ index, hero = false }: { index: number; hero?: boolean }) {
  const photo = STORY_PHOTOS[index];
  return <figure className={`story-photo ${hero ? "story-hero-photo" : ""}`}>
    {/* eslint-disable-next-line @next/next/no-img-element -- prebuilt responsive WebPs, with native aspect ratio and no runtime image service */}
    <img src={`/story/${photo.name}-${photo.widths.at(-1)}.webp`}
      srcSet={photo.widths.map((width) => `/story/${photo.name}-${width}.webp ${width}w`).join(", ")}
      sizes={hero ? "(max-width: 767px) calc(100vw - 40px), (max-width: 1279px) 48vw, 610px" : "(max-width: 767px) calc(100vw - 40px), 36vw"}
      width={photo.width} height={photo.height} alt={photo.alt}
      loading={hero ? "eager" : "lazy"} fetchPriority={hero ? "high" : "auto"} decoding="async" />
    <figcaption>{hero ? <><MapPin className="size-3" aria-hidden />New River Valley, Virginia · 2024</> : "2024 New River Valley flooding"}</figcaption>
  </figure>;
}

export default function OurStoryPage() {
  return <StoryReveals><article className="story-page" aria-labelledby="story-title">
    <header className="story-hero">
      <div className="story-hero-copy">
        <p className="page-eyebrow"><span className="story-dot" />Our story</p>
        <h1 id="story-title" className="story-heading">Because losing your home shouldn’t mean <em>losing your way.</em></h1>
        <p className="story-intro">{brand.projectName} started with a simple question: how can we make disaster recovery easier for the people who need help the most?</p>
        <a href="#where-it-began" className="story-read-link">Where the idea began <ArrowDown className="size-4" aria-hidden /></a>
      </div>
      <div className="story-hero-image"><span className="story-photo-marker" aria-hidden>01 / A place we call home</span><StoryPhoto index={0} hero /></div>
    </header>

    <section id="where-it-began" className="story-origin story-section" aria-labelledby="story-origin-title" data-story-reveal>
      <div className="story-section-label"><span>01</span><p>The beginning</p></div>
      <div className="story-origin-grid">
        <div className="story-prose">
          <h2 id="story-origin-title" className="story-heading">It started <em>close to home.</em></h2>
          <p>As a Virginia Tech student, I experienced the 2024 flooding in Virginia’s New River Valley firsthand. Seeing the damage made it clear how quickly a disaster can disrupt homes, communities and everyday life.</p>
          <p>What stayed with me was the question of what happens afterward.</p>
          <p>When someone loses their home or possessions, they’re also expected to navigate insurance claims, remember what they owned, find assistance and make difficult decisions. All while dealing with an incredibly stressful situation.</p>
          <p>I started wondering whether technology could make even a small part of that process easier.</p>
          <p className="story-byline">A personal starting point.<br /><span>A problem that reaches far beyond it.</span></p>
        </div>
        <div className="story-gallery" aria-label="Photographs of the New River Valley flooding and its aftermath">
          <StoryPhoto index={1} />
          <StoryPhoto index={2} />
        </div>
      </div>
    </section>

    <section className="story-problem story-section" aria-labelledby="story-problem-title" data-story-reveal>
      <div className="story-section-label"><span>02</span><p>After the immediate emergency</p></div>
      <div className="story-problem-grid">
        <h2 id="story-problem-title" className="story-heading">The hardest part shouldn’t be figuring out <em>what to do next.</em></h2>
        <ol className="story-problem-list">{PROBLEMS.map(({ icon: Icon, title, body }, index) => <li key={title}>
          <span className="story-problem-number">0{index + 1}</span>
          <div><h3><Icon className="size-[18px] text-blue" aria-hidden />{title}</h3><p>{body}</p></div>
        </li>)}</ol>
      </div>
    </section>

    <section className="story-memory story-section" aria-labelledby="story-memory-title" data-story-reveal>
      <div className="story-section-label"><span>03</span><p>A starting point, already in your photos</p></div>
      <div className="story-memory-copy">
        <h2 id="story-memory-title" className="story-heading">Your memories can <em>help you rebuild.</em></h2>
        <div className="story-prose"><p>Most of us don’t photograph our belongings for insurance. We photograph birthdays, holidays, family gatherings and ordinary moments at home.</p><p>In the background are details about the things we owned. What if AI could help turn those everyday photos into a starting point for an inventory?</p></div>
      </div>
      <InventoryIllustration />
      <div className="story-capabilities">
        <p>We’re designing {brand.projectName} to help you:</p>
        <ul>{[
          "Identify belongings in the photos you choose.",
          "Review and confirm items, with supporting photo evidence.",
          "Organize an inventory for an insurance conversation.",
          `Discover recovery resources and clearer next steps with ${brand.agentName}.`,
        ].map((text) => <li key={text}><Check className="size-4" aria-hidden />{text}</li>)}</ul>
      </div>
      <p className="story-verification"><ListChecks className="size-5 shrink-0 text-blue" aria-hidden />AI detections and valuations are suggestions for you to verify. They are not independent proof of ownership. Nothing enters your exported inventory without your confirmation.</p>
    </section>

    <section className="story-belief story-section" aria-labelledby="story-belief-title" data-story-reveal>
      <div className="story-section-label"><span>04</span><p>Why I’m building it</p></div>
      <div className="story-belief-grid">
        <h2 id="story-belief-title" className="story-heading">Technology should show up <em>when it matters most.</em></h2>
        <div className="story-prose">
          <p>I’m building {brand.projectName} for the Meta × Cerebral Valley AI Hackathon. But the inspiration comes from a problem much bigger than a competition.</p>
          <p>I believe meaningful uses of AI can be simple: helping someone remember what they lost, organize a complicated claim, or find a next step toward recovery.</p>
          <p>This is a developing project. There’s more to learn and more to build. Making a difficult moment a little easier is a good reason to start.</p>
        </div>
      </div>
    </section>

    <section className="story-closing" aria-labelledby="story-closing-title" data-story-reveal>
      <span className="story-closing-mark" aria-hidden><span /><span /><span /></span>
      <h2 id="story-closing-title" className="story-heading">No one should have to figure out <em>what’s next alone.</em></h2>
      <p>We’re building {brand.projectName} to make recovery clearer, more manageable and more human. One step at a time.</p>
      <div className="story-ctas"><ButtonLink href="/agent" variant="primary" size="lg">Talk to {brand.agentName}<ArrowRight className="size-4" aria-hidden /></ButtonLink><ButtonLink href="/" size="lg">Explore {brand.projectName}</ButtonLink></div>
      <p className="story-attribution">Created by a Virginia Tech student. Inspired by the New River Valley floods of 2024.<br />Built for the Meta × Cerebral Valley AI Hackathon.</p>
    </section>
  </article></StoryReveals>;
}

function InventoryIllustration() {
  return <figure className="story-process" aria-labelledby="story-process-caption">
    <div className="story-process-step"><div className="story-room" aria-hidden>
      <svg viewBox="0 0 280 170" fill="none"><path d="M0 135H280M22 0V135L0 170M258 0V135L280 170" stroke="var(--line-strong)" /><rect x="27" y="20" width="55" height="58" rx="3" fill="var(--blue-soft)" stroke="var(--blue)" /><path d="M54.5 20V78M27 49H82" stroke="var(--blue)" /><path d="M89 89C89 78 96 73 105 73H192C201 73 208 78 208 89V122H89Z" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" /><rect x="80" y="94" width="138" height="33" rx="7" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" /><path d="M90 127V138M207 127V138M244 65V134M231 134H256" stroke="var(--ink)" strokeWidth="2" /><path d="M231 39H256L262 65H225Z" fill="var(--blue-soft)" stroke="var(--blue)" /><ellipse cx="147" cy="146" rx="91" ry="13" fill="var(--surface-3)" /><rect x="73" y="68" width="150" height="63" rx="10" stroke="var(--accent)" strokeDasharray="4 4" /><rect x="221" y="34" width="45" height="105" rx="7" stroke="var(--blue)" strokeDasharray="4 4" /></svg>
    </div><span><Images className="size-4" aria-hidden />Everyday photo</span></div>
    <ArrowRight className="story-process-arrow" aria-hidden />
    <div className="story-process-step"><div className="story-detections" aria-hidden><span><span className="story-swatch" />Sofa <small>Review</small></span><span><span className="story-swatch story-swatch-blue" />Floor lamp <small>Review</small></span><p>You check what the AI found.</p></div><span><Search className="size-4" aria-hidden />Identified belongings</span></div>
    <ArrowRight className="story-process-arrow" aria-hidden />
    <div className="story-process-step"><div className="story-inventory" aria-hidden><div>Belonging<span>Evidence</span></div><div>Sofa<Check className="size-4 text-good" /></div><div>Floor lamp<Check className="size-4 text-good" /></div><p>Reviewed by you</p></div><span><ListChecks className="size-4" aria-hidden />Organized inventory</span></div>
    <figcaption id="story-process-caption">An illustration of the process. Every item and estimate needs your review.</figcaption>
  </figure>;
}

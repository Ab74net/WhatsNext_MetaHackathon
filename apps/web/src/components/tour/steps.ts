import brand from "@shared/brand.json";

// The guided tour. Each step points at an element marked data-tour="<anchor>" on `path`.
// If the anchor isn't on screen, the step shows as a centred card instead.
// Copy: calm, short sentences, no jargon or exclamation points.

export type TourStep = { path: string; anchor: string; title: string; body: string };

const A = brand.agentName;

export const TOUR_STEPS: TourStep[] = [
  {
    path: "/agent", anchor: "agent-input",
    title: `Ask ${A} a question`,
    body: `Tap a sample prompt, or type locally for keyword matching. ${A} answers with short cards, not long paragraphs.`,
  },
  {
    path: "/agent", anchor: "agent-messages",
    title: "Read your plan",
    body: "Answers include a plan card: what to do today, this week, and any deadlines. All content is scripted; official links are reference material.",
  },
  {
    path: "/agent", anchor: "agent-map",
    title: "Use the map",
    body: "Fictional example places appear on a local schematic. No real shelters, live alerts, or tile services are loaded.",
  },
  {
    path: "/agent", anchor: "call-911",
    title: "If anyone is hurt",
    body: "If someone is injured or in danger, call 911 first. This link stays at the top of every screen.",
  },
  {
    path: "/claims", anchor: "claims-step-select",
    title: "Choose a sample set",
    body: "Choose supplied living room, kitchen, or bedroom images. The demo accepts no personal photos and runs no models.",
  },
  {
    path: "/claims", anchor: "claims-step-review",
    title: "Check each item",
    body: "A simulated scan reveals precomputed detections. Edit and confirm example items. Sample price ranges have no retail sources.",
  },
  {
    path: "/claims", anchor: "claims-step-remember",
    title: "Remember what is missing",
    body: "The memory web suggests things people often own alongside what you confirmed. Nothing is added unless you add it.",
  },
  {
    path: "/claims", anchor: "claims-step-export",
    title: "Export your claim",
    body: "Generate CSV, XLSX, and a PDF in your browser. Every file says SAMPLE, concept demo; it is not a real claim.",
  },
  {
    path: "/aid", anchor: "aid-overview",
    title: "Explore Aid Autopilot",
    body: "Answer a few optional questions to explore financial, housing and everyday support. These are demo resources; check availability and eligibility with the provider.",
  },
  {
    path: "/aid", anchor: "aid-assistant",
    title: `Ask ${A} before you apply`,
    body: `Prepare a local draft for ${A} and see a scripted sample response. Your preparation notes and checklists stay out of the message. No applications are submitted here.`,
  },
  {
    path: "/our-story", anchor: "story-origin",
    title: "Why we’re building this",
    body: `The idea began with a Virginia Tech student's firsthand experience of the 2024 New River Valley floods. Our Story shares the personal inspiration behind ${brand.projectName}.`,
  },
];

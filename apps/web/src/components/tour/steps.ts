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
    body: `Type what is happening, or tap one of the suggestions. ${A} answers with short cards, not long paragraphs.`,
  },
  {
    path: "/agent", anchor: "agent-messages",
    title: "Read your plan",
    body: "Answers include a plan card: what to do today, this week, and any deadlines. Each line links to its official source.",
  },
  {
    path: "/agent", anchor: "agent-map",
    title: "Use the map",
    body: "Shelters, clinics and alerts appear here. Tap a place to see its address and when it was last checked.",
  },
  {
    path: "/agent", anchor: "call-911",
    title: "If anyone is hurt",
    body: "If someone is injured or in danger, call 911 first. This link stays at the top of every screen.",
  },
  {
    path: "/claims", anchor: "claims-step-select",
    title: "Add your photos",
    body: "Choose photos you already have, like birthdays or move-in day. Only the photos you pick are used, and they are deleted when you finish.",
  },
  {
    path: "/claims", anchor: "claims-step-review",
    title: "Check each item",
    body: "Each photo is scanned for belongings. You review every item and confirm it yourself. Prices are estimates, shown with their source.",
  },
  {
    path: "/claims", anchor: "claims-step-remember",
    title: "Remember what is missing",
    body: "The memory web suggests things people often own alongside what you confirmed. Nothing is added unless you add it.",
  },
  {
    path: "/claims", anchor: "claims-step-export",
    title: "Export your claim",
    body: "Download a spreadsheet and a PDF with a photo beside each item. This is a helper, not insurance or legal advice.",
  },
];

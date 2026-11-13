import { ButtonLink } from "@/components/ui";
export default function NotFound() {
  return <div className="mx-auto flex max-w-xl flex-col items-start gap-5 px-5 py-20"><p className="page-eyebrow">404 · Concept demo</p><h1 className="page-title">That page isn&apos;t here.</h1><p className="text-muted">Return to the demo to explore the sample recovery workflow.</p><ButtonLink href="/">Back to the demo</ButtonLink></div>;
}

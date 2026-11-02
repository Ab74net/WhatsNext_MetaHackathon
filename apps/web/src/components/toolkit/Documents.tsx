"use client";

// Document replacement order. Placeholder until the Virginia data file is verified (Phase 7, Task B).

import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ui";

export function Documents() {
  return (
    <EmptyState icon={<FileText className="size-5" />} title="Coming soon"
      body="A step-by-step order for replacing lost IDs, cards and records, checked against official sources." />
  );
}

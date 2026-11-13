import type { Metadata } from "next";
import { AidAutopilot } from "@/components/aid/AidAutopilot";

export const metadata: Metadata = { title: "Aid Autopilot", description: "A concept demonstration of local assistance matching and preparation checklists. Sample data only; eligibility is not determined." };

export default function AidPage() { return <AidAutopilot />; }

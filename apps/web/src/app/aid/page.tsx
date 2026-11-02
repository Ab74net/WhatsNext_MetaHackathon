import type { Metadata } from "next";
import brand from "@shared/brand.json";
import { AidAutopilot } from "@/components/aid/AidAutopilot";

export const metadata: Metadata = { title: `Aid Autopilot · ${brand.projectName}`, description: "Explore disaster assistance resources and prepare your next step." };

export default function AidPage() { return <AidAutopilot />; }

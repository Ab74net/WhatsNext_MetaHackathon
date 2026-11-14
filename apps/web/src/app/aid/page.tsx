import { AidAutopilot } from "@/components/aid/AidAutopilot";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("/aid/");

export default function AidPage() { return <AidAutopilot />; }

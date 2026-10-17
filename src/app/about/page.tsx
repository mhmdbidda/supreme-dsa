import type { Metadata } from "next";
import { Terminal } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PlaceholderPage
      title="About"
      icon={Terminal}
      description="The full project page is on the way: what the lab is for in CS 214, how the step model works, and how to run it locally. The summary below is what exists today."
      planned={[
        "Architecture — pure TypeScript algorithms that emit steps, UI that only plays them back",
        "Testing — Vitest suites covering sorting edge cases and playback bounds",
        "Run it — npm install, npm run dev, then npm test and npm run build",
        "Roadmap — the module order for the rest of the course",
      ]}
    />
  );
}

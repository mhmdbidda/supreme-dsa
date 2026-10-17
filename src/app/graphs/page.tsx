import type { Metadata } from "next";
import { GraphStudio } from "@/components/visualizers/GraphStudio";

export const metadata: Metadata = { title: "Graphs" };

export default function GraphsPage() {
  return <GraphStudio />;
}

import type { Metadata } from "next";
import { GraphStudio } from "@/components/visualizers/GraphStudio";

export const metadata: Metadata = {
  title: "Graphs",
  description:
    "An SVG graph editor with BFS and DFS playback, live frontier and visit order, BFS distances and both the adjacency list and matrix views.",
};

export default function GraphsPage() {
  return <GraphStudio />;
}

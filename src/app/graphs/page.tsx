import type { Metadata } from "next";
import { Network } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "Graphs" };

export default function GraphsPage() {
  return (
    <PlaceholderPage
      title="Graphs"
      icon={Network}
      description="Draw a graph from an edge list, then run traversal and pathfinding algorithms that light up the frontier, the visited set and the current edge as separate step states."
      planned={[
        "Representations — adjacency lists and adjacency matrices side by side",
        "BFS and DFS — frontier, visited set and tree edges per step",
        "Shortest paths — Dijkstra with distance relaxations",
        "Ordering — topological sort on a directed acyclic graph",
      ]}
    />
  );
}

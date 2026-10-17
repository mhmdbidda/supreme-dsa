import type { Metadata } from "next";
import { GitBranch } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "Trees" };

export default function TreesPage() {
  return (
    <PlaceholderPage
      title="Trees"
      icon={GitBranch}
      description="Node-by-node visualization of binary trees: build a tree, then watch traversals, searches and heap operations highlight exactly which node is visited, compared or rotated next."
      planned={[
        "Binary search trees — insert and search with comparison tracing",
        "Traversals — in-order, pre-order, post-order and breadth-first",
        "Heaps — build-heap, insert and extract-min with sift operations",
        "Balancing — height checks and rotation steps for AVL-style trees",
      ]}
    />
  );
}

import type { Metadata } from "next";
import { TreeExplorer } from "@/components/visualizers/TreeExplorer";

export const metadata: Metadata = {
  title: "Trees",
  description:
    "A binary search tree with insert, search and delete plus inorder, preorder and postorder traversals, drawn node by node with node and comparison counters.",
};

export default function TreesPage() {
  return <TreeExplorer />;
}

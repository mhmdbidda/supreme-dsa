import type { Metadata } from "next";
import { TreeExplorer } from "@/components/visualizers/TreeExplorer";

export const metadata: Metadata = { title: "Trees" };

export default function TreesPage() {
  return <TreeExplorer />;
}

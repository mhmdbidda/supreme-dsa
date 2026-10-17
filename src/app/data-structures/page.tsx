import type { Metadata } from "next";
import { DataStructuresLab } from "@/components/visualizers/DataStructuresLab";

export const metadata: Metadata = { title: "Data Structures" };

export default function DataStructuresPage() {
  return <DataStructuresLab />;
}

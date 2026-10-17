import type { Metadata } from "next";
import { SortingLab } from "@/components/visualizers/SortingLab";

export const metadata: Metadata = { title: "Sorting & Searching" };

export default function SortingPage() {
  return <SortingLab />;
}

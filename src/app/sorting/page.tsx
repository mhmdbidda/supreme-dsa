import type { Metadata } from "next";
import { SortingLab } from "@/components/visualizers/SortingLab";

export const metadata: Metadata = {
  title: "Sorting & Searching",
  description:
    "Step through bubble and merge sort plus linear and binary search, with live comparison, swap and merge counters on a shared bar chart.",
};

export default function SortingPage() {
  return <SortingLab />;
}

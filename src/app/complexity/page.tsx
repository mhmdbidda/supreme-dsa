import type { Metadata } from "next";
import { Gauge } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "Complexity" };

export default function ComplexityPage() {
  return (
    <PlaceholderPage
      title="Complexity"
      icon={Gauge}
      description="Where the counters from the lab turn into intuition: growth-rate curves and side-by-side comparisons of how each algorithm actually spends its comparisons and swaps as n grows."
      planned={[
        "Growth rates — O(1) through O(n²) plotted on the same axes",
        "Measured counters — real comparison and swap counts from the lab runs",
        "Space complexity — extra memory per algorithm, including recursion depth",
        "Big-O reference — a compact card deck for exam review",
      ]}
    />
  );
}

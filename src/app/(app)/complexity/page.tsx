import type { Metadata } from "next";
import { ComplexityLab } from "@/components/visualizers/ComplexityLab";

export const metadata: Metadata = {
  title: "Complexity",
  description:
    "A recursion visualizer with a live call stack and Fibonacci call tree, plus a seeded benchmark center measuring sorting and searching as n grows.",
};

export default function ComplexityPage() {
  return <ComplexityLab />;
}

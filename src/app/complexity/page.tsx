import type { Metadata } from "next";
import { ComplexityLab } from "@/components/visualizers/ComplexityLab";

export const metadata: Metadata = { title: "Complexity" };

export default function ComplexityPage() {
  return <ComplexityLab />;
}

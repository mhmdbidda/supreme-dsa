import type { Metadata } from "next";
import { DataStructuresLab } from "@/components/visualizers/DataStructuresLab";

export const metadata: Metadata = {
  title: "Data Structures",
  description:
    "Push, pop, enqueue and insert into a stack, a queue and a singly linked list, drawn pointer by pointer as each operation plays back.",
};

export default function DataStructuresPage() {
  return <DataStructuresLab />;
}

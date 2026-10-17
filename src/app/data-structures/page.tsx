import type { Metadata } from "next";
import { Database } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const metadata: Metadata = { title: "Data Structures" };

export default function DataStructuresPage() {
  return (
    <PlaceholderPage
      title="Data Structures"
      icon={Database}
      description="A second workbench for the structures themselves: operations are applied one at a time and every pointer, index or bucket change is recorded as a step you can play back like the sorting lab."
      planned={[
        "Stacks and queues — push, pop, enqueue, dequeue with a visible backing array",
        "Linked lists — insert, delete and reverse, with pointers redrawn per step",
        "Hash tables — key insertion, collision handling and load factor growth",
        "Dynamic arrays — amortized resizing shown as a copy event",
      ]}
    />
  );
}

import type { DSStructureId, DSStructureMeta } from "./types";

/**
 * Registry of the structures exposed by the playground.
 *
 * Adding another structure later is three steps:
 * 1. create `src/algorithms/data-structures/<name>.ts` with a hand-rolled
 *    class whose operations return `{ result, steps, counters, error? }`,
 * 2. add its id to `DSStructureId` in `types.ts`,
 * 3. append its metadata entry below — the UI picks it up automatically.
 */
export const dataStructures: Record<DSStructureId, DSStructureMeta> = {
  stack: {
    id: "stack",
    name: "Stack · LIFO",
    summary:
      "Last in, first out. A linked chain of nodes where push and pop only re-write the top pointer — both O(1), and popping an empty stack is an underflow.",
    emptyMessage: "Stack is empty — push a value to lay down the first node.",
    complexity: [
      { term: "Push", value: "O(1)" },
      { term: "Pop", value: "O(1)" },
      { term: "Peek", value: "O(1)" },
      { term: "Size", value: "O(1)" },
      { term: "Extra space", value: "O(n)" },
    ],
  },
  queue: {
    id: "queue",
    name: "Queue · FIFO",
    summary:
      "First in, first out. A linked chain kept between a front and a rear pointer, so enqueue appends behind the rear and dequeue removes the front node — both O(1).",
    emptyMessage: "Queue is empty — enqueue a value to create the front node.",
    complexity: [
      { term: "Enqueue", value: "O(1)" },
      { term: "Dequeue", value: "O(1)" },
      { term: "Front", value: "O(1)" },
      { term: "Size", value: "O(1)" },
      { term: "Extra space", value: "O(n)" },
    ],
  },
  "linked-list": {
    id: "linked-list",
    name: "Singly Linked List",
    summary:
      "Head and tail pointers over a chain of nodes. insertHead and insertTail are O(1); anything positional walks the chain, and reverse re-links every pointer in place.",
    emptyMessage: "List is empty — insert a value at the head or the tail.",
    complexity: [
      { term: "insertHead", value: "O(1)" },
      { term: "insertTail", value: "O(1) · tail pointer" },
      { term: "insertAt", value: "O(n)" },
      { term: "deleteAt / deleteValue", value: "O(n)" },
      { term: "search / traverse", value: "O(n)" },
      { term: "reverse", value: "O(n) · O(1) space" },
      { term: "size", value: "O(1)" },
    ],
  },
};

export function getStructureMeta(id: DSStructureId): DSStructureMeta {
  return dataStructures[id];
}

export { VisualLinkedList } from "./linkedList";
export { VisualQueue } from "./queue";
export { VisualStack } from "./stack";
export type {
  DSCounters,
  DSOperationResult,
  DSOutcome,
  DSPointers,
  DSSnapshot,
  DSStructureId,
  DSStructureMeta,
} from "./types";

import { bubbleSort } from "./bubbleSort";
import { mergeSort } from "./mergeSort";
import type {
  SortAlgorithm,
  SortAlgorithmId,
  SortCounters,
  SortOutcome,
  SortStep,
} from "./types";

/**
 * Registry of sorting algorithms exposed by the lab.
 *
 * Adding Selection, Insertion or Quick Sort later is three steps:
 * 1. create `src/algorithms/sorting/<name>.ts` exporting a pure function
 *    returning `{ result, steps, counters }`,
 * 2. add its id to `SortAlgorithmId` in `types.ts`,
 * 3. append its metadata entry below — the UI picks it up automatically.
 */
export const sortingAlgorithms: SortAlgorithm[] = [
  {
    id: "bubble",
    name: "Bubble Sort",
    summary:
      "Repeatedly swaps adjacent out-of-order pairs and stops early once a full pass makes no swaps.",
    complexity: {
      best: "O(n)",
      average: "O(n²)",
      worst: "O(n²)",
      space: "O(1)",
    },
    run: bubbleSort,
  },
  {
    id: "merge",
    name: "Merge Sort",
    summary:
      "Splits the array in half, sorts each half, then merges the two sorted halves with a stable write-back pass.",
    complexity: {
      best: "O(n log n)",
      average: "O(n log n)",
      worst: "O(n log n)",
      space: "O(n)",
    },
    run: mergeSort,
  },
];

export function getSortingAlgorithm(id: SortAlgorithmId): SortAlgorithm {
  return (
    sortingAlgorithms.find((algorithm) => algorithm.id === id) ??
    sortingAlgorithms[0]
  );
}

export { bubbleSort, mergeSort };
export type { SortAlgorithm, SortAlgorithmId, SortCounters, SortOutcome, SortStep };

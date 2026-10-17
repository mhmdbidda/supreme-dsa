import { binarySearch } from "./binarySearch";
import { linearSearch } from "./linearSearch";
import type {
  SearchAlgorithm,
  SearchAlgorithmId,
  SearchCounters,
  SearchOutcome,
  SearchStep,
} from "./types";

/**
 * Registry of searching algorithms exposed by the lab.
 *
 * Adding an algorithm later is three steps:
 * 1. create `src/algorithms/searching/<name>.ts` exporting a pure function
 *    `(input, target) => { result, steps, counters, refusedUnsortedInput }`,
 * 2. add its id to `SearchAlgorithmId` in `types.ts`,
 * 3. append its metadata entry below — the UI picks it up automatically.
 */
export const searchingAlgorithms: SearchAlgorithm[] = [
  {
    id: "linear",
    name: "Linear Search",
    summary:
      "Checks every item left to right and stops at the first match — no ordering assumed.",
    requiresSortedInput: false,
    complexity: {
      best: "O(1)",
      average: "O(n)",
      worst: "O(n)",
      space: "O(1)",
    },
    run: linearSearch,
  },
  {
    id: "binary",
    name: "Binary Search",
    summary:
      "Halves a sorted window on every probe. Unsorted input is refused instead of guessed.",
    requiresSortedInput: true,
    complexity: {
      best: "O(1)",
      average: "O(log n)",
      worst: "O(log n)",
      space: "O(1)",
    },
    run: binarySearch,
  },
];

export function getSearchAlgorithm(id: SearchAlgorithmId): SearchAlgorithm {
  return (
    searchingAlgorithms.find((algorithm) => algorithm.id === id) ??
    searchingAlgorithms[0]
  );
}

export { binarySearch, linearSearch };
export type {
  SearchAlgorithm,
  SearchAlgorithmId,
  SearchCounters,
  SearchOutcome,
  SearchStep,
};

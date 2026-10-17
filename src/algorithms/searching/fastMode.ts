import type { SearchAlgorithmId, SearchCounters } from "./types";

/**
 * FAST MODE for the searching algorithms: the exact same computation and
 * the exact same counters as the stepped versions in this folder, with
 * step recording removed. The Benchmark Center times these functions so
 * rendering and step-generation never land inside the measured section —
 * and `tests/benchmark.test.ts` asserts, for every input type, that the
 * fast result AND counters equal the stepped version's.
 *
 * Same contract as the stepped versions: pure functions, the input array
 * is NEVER mutated, `{ result, counters, refusedUnsortedInput }` out.
 */
export type FastSearchOutcome = {
  result: number | null;
  counters: SearchCounters;
  refusedUnsortedInput: boolean;
};

/** Linear Search: scans left to right, +1 comparison per index tested. */
export function linearSearchFast(
  input: number[],
  target: number,
): FastSearchOutcome {
  const counters: SearchCounters = { comparisons: 0 };

  for (let i = 0; i < input.length; i++) {
    counters.comparisons += 1;
    if (input[i] === target) {
      return { result: i, counters, refusedUnsortedInput: false };
    }
  }

  return { result: null, counters, refusedUnsortedInput: false };
}

/**
 * Binary Search (iterative) — mirrors `binarySearch` exactly: the O(n)
 * sortedness precondition pass is validation and is NOT counted, then
 * +1 comparison per mid probe.
 */
export function binarySearchFast(
  input: number[],
  target: number,
): FastSearchOutcome {
  const counters: SearchCounters = { comparisons: 0 };

  // Precondition check — validation, not part of the search counters.
  for (let i = 1; i < input.length; i++) {
    if (input[i] < input[i - 1]) {
      return { result: null, counters, refusedUnsortedInput: true };
    }
  }

  let low = 0;
  let high = input.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = input[mid];
    counters.comparisons += 1;

    if (value === target) {
      return { result: mid, counters, refusedUnsortedInput: false };
    }
    if (value < target) low = mid + 1;
    else high = mid - 1;
  }

  return { result: null, counters, refusedUnsortedInput: false };
}

export type FastSearcher = {
  id: SearchAlgorithmId;
  name: string;
  run: (input: number[], target: number) => FastSearchOutcome;
};

/** Registry mirroring `searchingAlgorithms`, without the step streams. */
export const fastSearchingAlgorithms: FastSearcher[] = [
  { id: "linear", name: "Linear Search", run: linearSearchFast },
  { id: "binary", name: "Binary Search", run: binarySearchFast },
];

export function getFastSearcher(id: SearchAlgorithmId): FastSearcher {
  return (
    fastSearchingAlgorithms.find((searcher) => searcher.id === id) ??
    fastSearchingAlgorithms[0]
  );
}

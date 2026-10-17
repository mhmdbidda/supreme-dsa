/**
 * Shared types for every sorting algorithm in `src/algorithms/sorting`.
 *
 * COUNTER DEFINITIONS (used by every algorithm in this folder):
 * - `comparisons` — incremented on EVERY element-to-element comparison
 *   (e.g. `array[j] > array[j + 1]` or `aux[i] <= aux[j]`), even when no
 *   swap/write happens as a result.
 * - `swaps` — incremented on EVERY swap (Bubble Sort) or every write of a
 *   value back into the array (Merge Sort).
 *
 * CONTRACT FOR ALL ALGORITHMS IN THIS FOLDER:
 * - Pure functions: no React, no DOM, no globals, no I/O.
 * - The input array is NEVER mutated; copy it first.
 * - Return `{ result, steps, counters }`.
 * - `steps[0]` is the untouched input; the last step shows the finished,
 *   fully sorted array with every index in `sortedIndices`.
 *
 * STEP SEMANTICS (the UI relies on these conventions):
 * - `comparedIndices` is set on EVERY step where a comparison took place.
 *   Those bars are painted in the muted "compared" tone, unless the same
 *   index is also `activeIndices` (the comparison triggered a swap/write),
 *   in which case the accent tone wins.
 * - `swapped: true` marks a step that swapped/wrote values; `activeIndices`
 *   on that step is painted in the accent tone.
 * - `sortedIndices` is cumulative and painted dim green (highest priority).
 */
export type SortStep = {
  array: number[];
  activeIndices: number[];
  comparedIndices?: number[];
  swapped?: boolean;
  sortedIndices?: number[];
  description: string;
};

/** See the counter definitions at the top of this file. */
export type SortCounters = {
  comparisons: number;
  swaps: number;
};

export type SortOutcome = {
  result: number[];
  steps: SortStep[];
  counters: SortCounters;
};

/**
 * Extending the lab = add a new id here, a new file in this folder, and one
 * entry in `index.ts`. The UI reads the registry, so no page changes needed.
 */
export type SortAlgorithmId = "bubble" | "merge";

export type SortComplexity = {
  best: string;
  average: string;
  worst: string;
  space: string;
};

export type SortAlgorithm = {
  id: SortAlgorithmId;
  name: string;
  summary: string;
  complexity: SortComplexity;
  run: (input: number[]) => SortOutcome;
};

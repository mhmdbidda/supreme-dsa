/**
 * Shared types for the searching algorithms in `src/algorithms/searching`.
 *
 * COUNTER DEFINITIONS:
 * - `comparisons` — incremented on EVERY element-to-element comparison
 *   between a stored value and the search target (one per probed index in
 *   linear search, one per mid probe in binary search).
 *   The sortedness precondition scan in `binarySearch` is a validation pass,
 *   not a search step, so it is deliberately NOT counted.
 *
 * CONTRACT (same rules as `src/algorithms/sorting`):
 * - Pure functions: no React, no DOM, no globals, no I/O.
 * - The input array is NEVER mutated; copy it first.
 * - Return `{ result, steps, counters }` where `result` is the index of the
 *   match (or `null`), `steps[0]` is the untouched input, and the last step
 *   carries the outcome.
 *
 * STEP SEMANTICS (the UI relies on these conventions):
 * - `comparedIndices` is set on every step where a comparison happened;
 *   those bars take the muted "compared" tone unless they are also active.
 * - `activeIndices` is the accent tone: the probe index for linear search,
 *   `mid` for binary search.
 * - `low` / `high` mark the current search window (binary only) — bars
 *   outside of it are dimmed by the UI.
 * - `mid` is the index binary search is probing.
 * - `foundIndex` is set on the matching step and on the final summary step;
 *   the UI paints it dim green.
 */
export type SearchStep = {
  array: number[];
  activeIndices: number[];
  comparedIndices?: number[];
  low?: number;
  high?: number;
  mid?: number;
  foundIndex?: number;
  description: string;
};

/** See the counter definition at the top of this file. */
export type SearchCounters = {
  comparisons: number;
};

export type SearchOutcome = {
  result: number | null;
  steps: SearchStep[];
  counters: SearchCounters;
  /**
   * True when the algorithm refused to search: binary search requires
   * sorted input, and an unsorted array is never searched (and never
   * counted). The UI turns this into a warning with a
   * "Sort a copy and search" action.
   */
  refusedUnsortedInput: boolean;
};

/**
 * Extending the lab = add a new id here, a new file in this folder, and one
 * entry in `index.ts`. The UI reads the registry, so no page changes needed.
 */
export type SearchAlgorithmId = "linear" | "binary";

export type SearchComplexity = {
  best: string;
  average: string;
  worst: string;
  space: string;
};

export type SearchAlgorithm = {
  id: SearchAlgorithmId;
  name: string;
  summary: string;
  requiresSortedInput: boolean;
  complexity: SearchComplexity;
  run: (input: number[], target: number) => SearchOutcome;
};

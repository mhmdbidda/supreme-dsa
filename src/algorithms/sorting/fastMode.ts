import type { SortAlgorithmId, SortCounters } from "./types";

/**
 * FAST MODE for the sorting algorithms: the exact same computation and the
 * exact same counters as the stepped versions in this folder, with step
 * recording removed. The Benchmark Center times these functions so the
 * step-generation cost never lands inside the measured section — and
 * `tests/benchmark.test.ts` asserts, for every input type, that the fast
 * result AND counters equal the stepped version's.
 *
 * Same contract as the stepped versions: pure functions, the input array
 * is NEVER mutated, `{ result, counters }` out.
 */
export type FastSortOutcome = {
  result: number[];
  counters: SortCounters;
};

/**
 * Bubble Sort with an early-exit flag — mirrors `bubbleSort` exactly:
 * +1 comparison per adjacent test, +1 swap per out-of-order pair, and the
 * remaining passes are skipped once a full pass makes no swaps.
 */
export function bubbleSortFast(input: number[]): FastSortOutcome {
  const array = [...input];
  const counters: SortCounters = { comparisons: 0, swaps: 0 };
  const size = array.length;

  for (let pass = 0; pass < size - 1; pass++) {
    let swappedThisPass = false;
    const lastUnsorted = size - pass - 1;

    for (let j = 0; j < lastUnsorted; j++) {
      counters.comparisons += 1;
      const left = array[j];
      const right = array[j + 1];
      if (left > right) {
        array[j] = right;
        array[j + 1] = left;
        counters.swaps += 1;
        swappedThisPass = true;
      }
    }

    if (!swappedThisPass) break;
  }

  return { result: array, counters };
}

/**
 * Merge Sort (top-down, stable) — mirrors `mergeSort` exactly, including
 * its counter definitions: +1 comparison per `aux[i] <= aux[j]` test, and
 * +1 write ("swap/move") for EVERY value written back into the main
 * array, tail copies included.
 */
export function mergeSortFast(input: number[]): FastSortOutcome {
  const array = [...input];
  const counters: SortCounters = { comparisons: 0, swaps: 0 };
  const size = array.length;
  const aux = new Array<number>(size);

  const merge = (lo: number, mid: number, hi: number) => {
    for (let k = lo; k <= hi; k++) aux[k] = array[k];

    let i = lo;
    let j = mid + 1;

    for (let k = lo; k <= hi; k++) {
      if (i > mid) {
        array[k] = aux[j++];
        counters.swaps += 1;
        continue;
      }
      if (j > hi) {
        array[k] = aux[i++];
        counters.swaps += 1;
        continue;
      }

      counters.comparisons += 1;
      const takeLeft = aux[i] <= aux[j];
      array[k] = takeLeft ? aux[i++] : aux[j++];
      counters.swaps += 1;
    }
  };

  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    sort(lo, mid);
    sort(mid + 1, hi);
    merge(lo, mid, hi);
  };

  if (size > 1) sort(0, size - 1);

  return { result: array, counters };
}

export type FastSorter = {
  id: SortAlgorithmId;
  name: string;
  run: (input: number[]) => FastSortOutcome;
};

/** Registry mirroring `sortingAlgorithms`, without the step streams. */
export const fastSortingAlgorithms: FastSorter[] = [
  { id: "bubble", name: "Bubble Sort", run: bubbleSortFast },
  { id: "merge", name: "Merge Sort", run: mergeSortFast },
];

export function getFastSorter(id: SortAlgorithmId): FastSorter {
  return fastSortingAlgorithms.find((sorter) => sorter.id === id) ?? fastSortingAlgorithms[0];
}

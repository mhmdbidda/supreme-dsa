import type { SortCounters, SortOutcome, SortStep } from "./types";

/**
 * Merge Sort (top-down, stable) with a write-back merge.
 *
 * Counters (see `types.ts`):
 * - comparisons: +1 for every `aux[i] <= aux[j]` test between the heads of
 *   the two halves being merged.
 * - swaps: +1 for every write of a value back into the main array
 *   (including the tail copies that follow no comparison).
 *
 * The merge window `[lo..hi]` is reported in `comparedIndices` (muted tone)
 * and the current write destination in `activeIndices` (accent tone).
 */
export function mergeSort(input: number[]): SortOutcome {
  // Never mutate the caller's array.
  const array = [...input];
  const steps: SortStep[] = [];
  const counters: SortCounters = { comparisons: 0, swaps: 0 };
  const size = array.length;
  const aux = new Array<number>(size);

  steps.push({
    array: [...array],
    activeIndices: [],
    sortedIndices: [],
    description:
      size === 0
        ? "Empty array — nothing to sort."
        : `Ready: ${size} element${size === 1 ? "" : "s"} loaded.`,
  });

  const windowIndices = (lo: number, hi: number) =>
    Array.from({ length: hi - lo + 1 }, (_, offset) => lo + offset);

  const write = (index: number, value: number) => {
    array[index] = value;
    counters.swaps += 1;
    steps.push({
      array: [...array],
      activeIndices: [index],
      swapped: true,
      description: `Write ${value} → index ${index}.`,
    });
  };

  const merge = (lo: number, mid: number, hi: number) => {
    for (let k = lo; k <= hi; k++) aux[k] = array[k];

    let i = lo;
    let j = mid + 1;

    for (let k = lo; k <= hi; k++) {
      if (i > mid) {
        write(k, aux[j++]);
        continue;
      }
      if (j > hi) {
        write(k, aux[i++]);
        continue;
      }

      counters.comparisons += 1;
      const takeLeft = aux[i] <= aux[j];
      steps.push({
        array: [...array],
        activeIndices: [k],
        comparedIndices: windowIndices(lo, hi),
        swapped: false,
        description: `Comparing ${aux[i]} and ${aux[j]} in range [${lo}..${hi}] — ${
          takeLeft ? aux[i] : aux[j]
        } goes to index ${k}.`,
      });
      write(k, takeLeft ? aux[i++] : aux[j++]);
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

  if (size > 0) {
    const all = array.map((_, index) => index);
    steps.push({
      array: [...array],
      activeIndices: [],
      sortedIndices: all,
      description: `Done — sorted in ${counters.comparisons} comparison${
        counters.comparisons === 1 ? "" : "s"
      } and ${counters.swaps} write${counters.swaps === 1 ? "" : "s"}.`,
    });
  }

  return { result: [...array], steps, counters };
}

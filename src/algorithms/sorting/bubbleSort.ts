import type { SortCounters, SortOutcome, SortStep } from "./types";

/**
 * Bubble Sort with an early-exit flag.
 *
 * Counters (see `types.ts`):
 * - comparisons: +1 for every adjacent pair test (`array[j] > array[j + 1]`).
 * - swaps: +1 for every swap of two out-of-order neighbours.
 *
 * Early exit: if a full pass performs no swaps the array is already sorted,
 * so the remaining passes are skipped and the step stream ends early.
 */
export function bubbleSort(input: number[]): SortOutcome {
  // Never mutate the caller's array.
  const array = [...input];
  const steps: SortStep[] = [];
  const counters: SortCounters = { comparisons: 0, swaps: 0 };
  const sortedIndices = new Set<number>();
  const size = array.length;

  steps.push({
    array: [...array],
    activeIndices: [],
    sortedIndices: [],
    description:
      size === 0
        ? "Empty array — nothing to sort."
        : `Ready: ${size} element${size === 1 ? "" : "s"} loaded.`,
  });

  const sortedSnapshot = () => [...sortedIndices].sort((a, b) => a - b);

  for (let pass = 0; pass < size - 1; pass++) {
    let swappedThisPass = false;
    const lastUnsorted = size - pass - 1;

    for (let j = 0; j < lastUnsorted; j++) {
      counters.comparisons += 1;
      const left = array[j];
      const right = array[j + 1];
      const shouldSwap = left > right;

      if (shouldSwap) {
        array[j] = right;
        array[j + 1] = left;
        counters.swaps += 1;
        swappedThisPass = true;
        steps.push({
          array: [...array],
          activeIndices: [j, j + 1],
          comparedIndices: [j, j + 1],
          swapped: true,
          sortedIndices: sortedSnapshot(),
          description: `${left} > ${right} — swapped positions ${j} and ${j + 1}.`,
        });
      } else {
        steps.push({
          array: [...array],
          activeIndices: [],
          comparedIndices: [j, j + 1],
          swapped: false,
          sortedIndices: sortedSnapshot(),
          description: `${left} ≤ ${right} — already in order, no swap.`,
        });
      }
    }

    // The largest remaining value bubbles into its final slot.
    sortedIndices.add(lastUnsorted);

    if (!swappedThisPass) {
      for (let k = 0; k < lastUnsorted; k++) sortedIndices.add(k);
      steps.push({
        array: [...array],
        activeIndices: [],
        sortedIndices: sortedSnapshot(),
        description: `Pass ${pass + 1} made no swaps — early exit, the array is sorted.`,
      });
      break;
    }

    steps.push({
      array: [...array],
      activeIndices: [],
      sortedIndices: sortedSnapshot(),
      description: `Pass ${pass + 1} complete — index ${lastUnsorted} is final.`,
    });
  }

  if (size > 0) {
    const all = array.map((_, index) => index);
    steps.push({
      array: [...array],
      activeIndices: [],
      sortedIndices: all,
      description: `Done — sorted in ${counters.comparisons} comparison${
        counters.comparisons === 1 ? "" : "s"
      } and ${counters.swaps} swap${counters.swaps === 1 ? "" : "s"}.`,
    });
  }

  return { result: [...array], steps, counters };
}

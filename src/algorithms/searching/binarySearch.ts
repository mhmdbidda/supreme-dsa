import type { SearchCounters, SearchOutcome, SearchStep } from "./types";

/**
 * Binary Search (iterative) over a sorted array.
 *
 * Counter (see `types.ts`): `comparisons` +1 for every mid probe
 * (3 probes for the last item of a 5-element array, for example).
 *
 * Preconditions: the input must be sorted ascending. The precondition is
 * checked in a single O(n) validation pass which is NOT counted as a search
 * comparison. If the input is unsorted the search is refused outright —
 * nothing is probed, no comparison is counted, and `refusedUnsortedInput`
 * is returned so the UI can offer sorting a copy first.
 */
export function binarySearch(input: number[], target: number): SearchOutcome {
  // Never mutate the caller's array.
  const array = [...input];
  const steps: SearchStep[] = [];
  const counters: SearchCounters = { comparisons: 0 };
  const size = array.length;

  // Precondition check — validation, not part of the search counters.
  for (let i = 1; i < size; i++) {
    if (array[i] < array[i - 1]) {
      steps.push({
        array: [...array],
        activeIndices: [],
        description: `Array is not sorted at index ${i} (${array[i - 1]} > ${array[i]}) — binary search needs sorted input, so nothing was searched.`,
      });
      return { result: null, steps, counters, refusedUnsortedInput: true };
    }
  }

  let low = 0;
  let high = size - 1;
  let foundIndex: number | null = null;

  steps.push({
    array: [...array],
    activeIndices: [],
    ...(size > 0 ? { low: 0, high: size - 1 } : {}),
    description:
      size === 0
        ? "Empty array — nothing to search."
        : `Binary search for ${target} in ${size} sorted item${size === 1 ? "" : "s"} — window [0..${size - 1}].`,
  });

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = array[mid];
    counters.comparisons += 1;

    if (value === target) {
      foundIndex = mid;
      steps.push({
        array: [...array],
        activeIndices: [mid],
        comparedIndices: [mid],
        low,
        high,
        mid,
        foundIndex: mid,
        description: `${value} at mid ${mid} matches ${target}.`,
      });
      break;
    }

    if (value < target) {
      const nextLow = mid + 1;
      steps.push({
        array: [...array],
        activeIndices: [mid],
        comparedIndices: [mid],
        low,
        high,
        mid,
        description: `${value} < ${target} at mid ${mid} — discard the left half, low = ${nextLow}.`,
      });
      low = nextLow;
    } else {
      const nextHigh = mid - 1;
      steps.push({
        array: [...array],
        activeIndices: [mid],
        comparedIndices: [mid],
        low,
        high,
        mid,
        description: `${value} > ${target} at mid ${mid} — discard the right half, high = ${nextHigh}.`,
      });
      high = nextHigh;
    }
  }

  if (size > 0) {
    const unit = counters.comparisons === 1 ? "comparison" : "comparisons";
    steps.push(
      foundIndex === null
        ? {
            // The window is exhausted: `low` sits above `high`, so every bar
            // reads as "outside the window".
            array: [...array],
            activeIndices: [],
            low,
            high,
            description: `Not found — ${target} is not in the array (${counters.comparisons} ${unit}, window is empty).`,
          }
        : {
            array: [...array],
            activeIndices: [foundIndex],
            foundIndex,
            description: `Found ${target} at index ${foundIndex} after ${counters.comparisons} ${unit}.`,
          },
    );
  }

  return {
    result: foundIndex,
    steps,
    counters,
    refusedUnsortedInput: false,
  };
}

import type { SearchCounters, SearchOutcome, SearchStep } from "./types";

/**
 * Linear Search: scans left to right and stops at the first match.
 *
 * Counter (see `types.ts`): `comparisons` +1 for every index that is
 * compared against the target — n comparisons when the target is absent.
 */
export function linearSearch(input: number[], target: number): SearchOutcome {
  // Never mutate the caller's array.
  const array = [...input];
  const steps: SearchStep[] = [];
  const counters: SearchCounters = { comparisons: 0 };
  const size = array.length;
  let foundIndex: number | null = null;

  steps.push({
    array: [...array],
    activeIndices: [],
    description:
      size === 0
        ? "Empty array — nothing to search."
        : `Linear scan for ${target} across ${size} item${size === 1 ? "" : "s"}.`,
  });

  for (let i = 0; i < size; i++) {
    counters.comparisons += 1;
    const match = array[i] === target;

    if (match) {
      foundIndex = i;
      steps.push({
        array: [...array],
        activeIndices: [i],
        comparedIndices: [i],
        foundIndex: i,
        description: `${array[i]} at index ${i} matches ${target} — stop.`,
      });
      break;
    }

    steps.push({
      array: [...array],
      activeIndices: [i],
      comparedIndices: [i],
      description: `${array[i]} at index ${i} ≠ ${target} — keep scanning.`,
    });
  }

  if (size > 0) {
    const unit = counters.comparisons === 1 ? "comparison" : "comparisons";
    steps.push(
      foundIndex === null
        ? {
            array: [...array],
            activeIndices: [],
            description: `Not found — ${target} is not in the array (${counters.comparisons} ${unit}).`,
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

import { RecursionRecorder } from "./recorder";
import type { RecursionOutcome } from "./types";

/** Input guard: the array is capped at 30 elements or the run is refused. */
export const RECURSIVE_SEARCH_MAX_LENGTH = 30;

/** Internal "not found" sentinel; the public result maps it to `null`. */
const NOT_FOUND = -1;

/**
 * Recursive Binary Search over a sorted array: probe the middle, then
 * recurse into the half that can still hold the target. The base cases
 * are an exhausted window (`lo > hi` → the target is absent) and a middle
 * probe that matches.
 *
 * Preconditions and guards (a refusal returns an error and does NOT run):
 * - the array holds at most RECURSIVE_SEARCH_MAX_LENGTH elements,
 * - every element is a finite number,
 * - the array is sorted ascending — the same rule as the iterative
 *   `binarySearch` in `src/algorithms/searching`; the sortedness pass is
 *   validation, not part of the recursion, so it is never counted.
 *
 * The input array is only read, never mutated.
 */
export function recursiveBinarySearch(
  sortedArray: readonly number[],
  target: number,
): RecursionOutcome {
  const refuse = (error: string): RecursionOutcome => ({
    result: null,
    steps: [],
    counters: { calls: 0, maxDepth: 0 },
    error,
  });

  if (!Array.isArray(sortedArray)) {
    return refuse("Binary search refused: the input must be an array of numbers.");
  }
  if (sortedArray.length > RECURSIVE_SEARCH_MAX_LENGTH) {
    return refuse(
      `Binary search refused: at most ${RECURSIVE_SEARCH_MAX_LENGTH} elements are simulated — got ${sortedArray.length}, so nothing ran.`,
    );
  }
  if (!Number.isFinite(target)) {
    return refuse(
      `Binary search refused: the target must be a finite number — got ${String(target)}.`,
    );
  }
  for (let i = 0; i < sortedArray.length; i++) {
    if (!Number.isFinite(sortedArray[i])) {
      return refuse(
        `Binary search refused: element ${i} is not a finite number — got ${String(sortedArray[i])}.`,
      );
    }
  }
  for (let i = 1; i < sortedArray.length; i++) {
    if (sortedArray[i] < sortedArray[i - 1]) {
      return refuse(
        `Binary search refused: the array is not sorted at index ${i} (${sortedArray[i - 1]} > ${sortedArray[i]}) — binary search needs sorted input, so nothing ran.`,
      );
    }
  }

  const recorder = new RecursionRecorder();

  const search = (lo: number, hi: number): number => {
    if (lo > hi) {
      recorder.enter(
        "binarySearch",
        `lo = ${lo}, hi = ${hi}`,
        `Base case: the window [${lo}..${hi}] is empty — every candidate has been discarded, so ${target} is not in the array.`,
        true,
      );
      recorder.exit(NOT_FOUND, "Return not-found — the empty-window base case answers directly.");
      return NOT_FOUND;
    }

    const mid = Math.floor((lo + hi) / 2);
    const value = sortedArray[mid];
    const matched = value === target;
    recorder.enter(
      "binarySearch",
      `lo = ${lo}, hi = ${hi}`,
      `Probe mid ${mid}: ${value} vs ${target} — ${
        matched
          ? "equal, the search is over"
          : value < target
            ? `${value} < ${target}, discard the left half`
            : `${value} > ${target}, discard the right half`
      }.`,
      matched,
    );

    if (matched) {
      recorder.exit(mid, `Return ${mid} — ${target} matched at mid ${mid}, base case.`);
      return mid;
    }

    if (value < target) {
      const found = search(mid + 1, hi);
      recorder.exit(
        found,
        found === NOT_FOUND
          ? `Return not-found — the right half [${mid + 1}..${hi}] held no ${target}.`
          : `Return ${found} unchanged — the match was found deeper in the right half.`,
      );
      return found;
    }

    const found = search(lo, mid - 1);
    recorder.exit(
      found,
      found === NOT_FOUND
        ? `Return not-found — the left half [${lo}..${mid - 1}] held no ${target}.`
        : `Return ${found} unchanged — the match was found deeper in the left half.`,
    );
    return found;
  };

  const found = search(0, sortedArray.length - 1);
  return {
    result: found === NOT_FOUND ? null : found,
    steps: recorder.toSteps(),
    counters: recorder.snapshotCounters(),
  };
}

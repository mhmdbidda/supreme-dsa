import { RecursionRecorder } from "./recorder";
import type { RecursionOutcome } from "./types";

/** Input guard: n must be an integer in [0, 10] or the run is refused. */
export const FIBONACCI_MIN = 0;
export const FIBONACCI_MAX = 10;

/**
 * Naive recursive Fibonacci: `fib(n) = fib(n - 1) + fib(n - 2)` with the
 * base cases `fib(0) = 0` and `fib(1) = 1`. Nothing is memoized on
 * purpose — the repeated subproblems ARE the lesson, and the call-tree
 * view in the UI grows one node per call so the duplication is visible
 * (fib(5) expands to 15 calls for one answer).
 *
 * The input is bounded to [0, 10] so the exponential step stream stays
 * safe to record. Out-of-range input returns an error and does NOT run.
 */
export function fibonacci(n: number): RecursionOutcome {
  if (!Number.isInteger(n) || n < FIBONACCI_MIN || n > FIBONACCI_MAX) {
    return {
      result: null,
      steps: [],
      counters: { calls: 0, maxDepth: 0 },
      error: `Fibonacci refused: n must be an integer from ${FIBONACCI_MIN} to ${FIBONACCI_MAX} — got ${String(n)}, so nothing ran.`,
    };
  }

  const recorder = new RecursionRecorder();

  const fib = (k: number): number => {
    const isBase = k <= 1;
    recorder.enter(
      "fibonacci",
      `n = ${k}`,
      isBase
        ? `Base case: fib(${k}) = ${k} — small enough to answer without recursing.`
        : `Expand fib(${k}) = fib(${k - 1}) + fib(${k - 2}) — two subproblems, no memoization.`,
      isBase,
    );

    if (isBase) {
      recorder.exit(k, `Return ${k} — the base case fib(${k}) answers directly.`);
      return k;
    }

    const left = fib(k - 1);
    const right = fib(k - 2);
    const value = left + right;
    recorder.exit(
      value,
      `Return fib(${k - 1}) = ${left} plus fib(${k - 2}) = ${right} → ${value} — the frame for n = ${k} pops.`,
    );
    return value;
  };

  const result = fib(n);
  return { result, steps: recorder.toSteps(), counters: recorder.snapshotCounters() };
}

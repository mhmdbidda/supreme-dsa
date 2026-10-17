import { RecursionRecorder } from "./recorder";
import type { RecursionOutcome } from "./types";

/** Input guard: n must be an integer in [0, 12] or the run is refused. */
export const FACTORIAL_MIN = 0;
export const FACTORIAL_MAX = 12;

/**
 * Factorial, the canonical linear recursion: `n! = n × (n - 1)!` with the
 * base case `0! = 1`. The multiplication happens ON THE WAY BACK, which is
 * why every `return` step shows the value the frame hands to its caller.
 *
 * The input is bounded to [0, 12] — beyond that the step stream grows
 * without teaching anything new (and 13! already exceeds exact float
 * arithmetic's comfortable range for this lab). Out-of-range input returns
 * an error and does NOT run.
 */
export function factorial(n: number): RecursionOutcome {
  if (!Number.isInteger(n) || n < FACTORIAL_MIN || n > FACTORIAL_MAX) {
    return {
      result: null,
      steps: [],
      counters: { calls: 0, maxDepth: 0 },
      error: `Factorial refused: n must be an integer from ${FACTORIAL_MIN} to ${FACTORIAL_MAX} — got ${String(n)}, so nothing ran.`,
    };
  }

  const recorder = new RecursionRecorder();

  const fact = (k: number): number => {
    const isBase = k === 0;
    recorder.enter(
      "factorial",
      `n = ${k}`,
      isBase
        ? "Base case: 0! = 1 — there is nothing left to expand, so this frame can answer immediately."
        : `Expand ${k}! = ${k} × ${(k - 1)}! — recurse first, multiply on the way back.`,
      isBase,
    );

    if (isBase) {
      recorder.exit(1, "Return 1 — the base case answers 0! directly.");
      return 1;
    }

    const sub = fact(k - 1);
    const value = k * sub;
    recorder.exit(
      value,
      `Return ${k} × ${sub} = ${value} — the frame for n = ${k} pops with its answer.`,
    );
    return value;
  };

  const result = fact(n);
  return { result, steps: recorder.toSteps(), counters: recorder.snapshotCounters() };
}

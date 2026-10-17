import type { SortStep } from "@/algorithms/sorting/types";

export type StepProgress = {
  comparisons: number;
  swaps: number;
  stepNumber: number;
  totalSteps: number;
};

/**
 * Live counters for the side panel.
 *
 * The step stream does not carry running totals, so we derive them from the
 * conventions documented in `src/algorithms/sorting/types.ts`:
 * - a step with `comparedIndices` is a comparison (it may also swap),
 * - a step with `swapped: true` is a swap (Bubble) or a write (Merge).
 *
 * The scan stops at `index`, so the numbers grow while the steps play back.
 */
export function summarizeProgress(steps: SortStep[], index: number): StepProgress {
  const totalSteps = steps.length;
  if (totalSteps === 0) {
    return { comparisons: 0, swaps: 0, stepNumber: 0, totalSteps: 0 };
  }

  const last = Math.min(Math.max(index, 0), totalSteps - 1);
  let comparisons = 0;
  let swaps = 0;

  for (let i = 0; i <= last; i++) {
    const step = steps[i];
    // `comparedIndices` is present on every step where a comparison ran,
    // including the ones that also swapped (accent wins the paint order).
    if (step.comparedIndices !== undefined) comparisons += 1;
    // `swapped` marks the steps that wrote a value back into the array.
    if (step.swapped) swaps += 1;
  }

  return { comparisons, swaps, stepNumber: last + 1, totalSteps };
}

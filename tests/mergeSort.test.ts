import { describe, expect, it } from "vitest";
import { mergeSort } from "../src/algorithms/sorting/mergeSort";
import { summarizeProgress } from "../src/lib/progress";

const cases: Array<{ name: string; input: number[]; expected: number[] }> = [
  { name: "an empty array", input: [], expected: [] },
  { name: "a single item", input: [42], expected: [42] },
  { name: "duplicates", input: [3, 1, 3, 1, 2], expected: [1, 1, 2, 3, 3] },
  { name: "negatives", input: [-2, 5, -9, 0, -2], expected: [-9, -2, -2, 0, 5] },
  { name: "an already sorted array", input: [1, 2, 3, 4, 5], expected: [1, 2, 3, 4, 5] },
  { name: "a reverse sorted array", input: [5, 4, 3, 2, 1], expected: [1, 2, 3, 4, 5] },
];

describe("mergeSort", () => {
  for (const { name, input, expected } of cases) {
    it(`sorts ${name}`, () => {
      const outcome = mergeSort(input);
      expect(outcome.result).toEqual(expected);
      expect(outcome.steps.length).toBeGreaterThan(0);
      expect(outcome.counters.comparisons).toBeGreaterThanOrEqual(0);
      expect(outcome.counters.swaps).toBeGreaterThanOrEqual(0);
    });
  }

  it("does not mutate the input array", () => {
    const input = [5, -1, 3, 3, 0];
    const snapshot = [...input];
    mergeSort(input);
    expect(input).toEqual(snapshot);
  });

  it("returns a result that is not a reference to the input", () => {
    const input = [2, 1];
    const { result } = mergeSort(input);
    expect(result).not.toBe(input);
    result.push(99);
    expect(input).toEqual([2, 1]);
  });

  it("starts from the untouched input and ends with the sorted result", () => {
    const input = [9, -4, 2, 2, 7];
    const { result, steps } = mergeSort(input);
    const first = steps[0];
    const last = steps[steps.length - 1];

    expect(first.array).toEqual(input);
    expect(last.array).toEqual(result);
    expect(last.array).toEqual([...input].sort((a, b) => a - b));
    expect(last.sortedIndices).toEqual(input.map((_, index) => index));
  });

  it("keeps every step array the same length as the input", () => {
    const input = [7, 7, 1, -3, 12, 0];
    const { steps } = mergeSort(input);
    for (const step of steps) {
      expect(step.array).toHaveLength(input.length);
      expect(Array.isArray(step.activeIndices)).toBe(true);
      expect(typeof step.description).toBe("string");
    }
  });

  it("writes each element of the input back exactly once per merge level", () => {
    const input = [5, 4, 3, 2, 1];
    const { counters, steps } = mergeSort(input);
    const writeSteps = steps.filter((step) => step.swapped === true);
    expect(counters.swaps).toBe(writeSteps.length);
    // Writes per merge: [0..1] = 2, [0..2] = 3, [3..4] = 2, [0..4] = 5.
    expect(counters.swaps).toBe(12);
    expect(counters.comparisons).toBeGreaterThan(0);
  });

  it("reports a merge window and a write target while merging", () => {
    const { steps } = mergeSort([4, 2, 3, 1]);
    const comparisonStep = steps.find((step) => step.comparedIndices !== undefined);
    expect(comparisonStep).toBeDefined();
    expect(comparisonStep?.comparedIndices?.length).toBeGreaterThan(1);
    expect(comparisonStep?.activeIndices).toHaveLength(1);
  });

  it("live progress counters match the algorithm totals at the last step", () => {
    const input = [4, -1, 4, 9, 2, 2];
    const { steps, counters } = mergeSort(input);
    const progress = summarizeProgress(steps, steps.length - 1);
    expect(progress.comparisons).toBe(counters.comparisons);
    expect(progress.swaps).toBe(counters.swaps);
    expect(progress.stepNumber).toBe(steps.length);
  });
});

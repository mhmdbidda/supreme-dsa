import { describe, expect, it } from "vitest";
import { bubbleSort } from "../src/algorithms/sorting/bubbleSort";
import { summarizeProgress } from "../src/lib/progress";

const cases: Array<{ name: string; input: number[]; expected: number[] }> = [
  { name: "an empty array", input: [], expected: [] },
  { name: "a single item", input: [42], expected: [42] },
  { name: "duplicates", input: [3, 1, 3, 1, 2], expected: [1, 1, 2, 3, 3] },
  { name: "negatives", input: [-2, 5, -9, 0, -2], expected: [-9, -2, -2, 0, 5] },
  { name: "an already sorted array", input: [1, 2, 3, 4, 5], expected: [1, 2, 3, 4, 5] },
  { name: "a reverse sorted array", input: [5, 4, 3, 2, 1], expected: [1, 2, 3, 4, 5] },
];

describe("bubbleSort", () => {
  for (const { name, input, expected } of cases) {
    it(`sorts ${name}`, () => {
      const outcome = bubbleSort(input);
      expect(outcome.result).toEqual(expected);
      expect(outcome.steps.length).toBeGreaterThan(0);
      expect(outcome.counters.comparisons).toBeGreaterThanOrEqual(0);
      expect(outcome.counters.swaps).toBeGreaterThanOrEqual(0);
    });
  }

  it("does not mutate the input array", () => {
    const input = [5, -1, 3, 3, 0];
    const snapshot = [...input];
    bubbleSort(input);
    expect(input).toEqual(snapshot);
  });

  it("returns a result that is not a reference to the input", () => {
    const input = [2, 1];
    const { result } = bubbleSort(input);
    expect(result).not.toBe(input);
    result.push(99);
    expect(input).toEqual([2, 1]);
  });

  it("starts from the untouched input and ends with the sorted result", () => {
    const input = [9, -4, 2, 2, 7];
    const { result, steps } = bubbleSort(input);
    const first = steps[0];
    const last = steps[steps.length - 1];

    expect(first.array).toEqual(input);
    expect(last.array).toEqual(result);
    expect(last.array).toEqual([...input].sort((a, b) => a - b));
    expect(last.sortedIndices).toEqual(input.map((_, index) => index));
  });

  it("keeps every step array the same length as the input", () => {
    const input = [7, 7, 1, -3, 12, 0];
    const { steps } = bubbleSort(input);
    for (const step of steps) {
      expect(step.array).toHaveLength(input.length);
      expect(Array.isArray(step.activeIndices)).toBe(true);
      expect(typeof step.description).toBe("string");
    }
  });

  it("exits early when the array is already sorted", () => {
    const { counters, steps } = bubbleSort([1, 2, 3, 4, 5]);
    expect(counters.comparisons).toBe(4);
    expect(counters.swaps).toBe(0);
    expect(steps.some((step) => step.description.includes("early exit"))).toBe(true);
  });

  it("counts one comparison and one swap per out-of-order pair in reverse order", () => {
    const { counters } = bubbleSort([5, 4, 3, 2, 1]);
    expect(counters.comparisons).toBe(10);
    expect(counters.swaps).toBe(10);
  });

  it("live progress counters match the algorithm totals at the last step", () => {
    const input = [4, -1, 4, 9, 2, 2];
    const { steps, counters } = bubbleSort(input);
    const progress = summarizeProgress(steps, steps.length - 1);
    expect(progress.comparisons).toBe(counters.comparisons);
    expect(progress.swaps).toBe(counters.swaps);
    expect(progress.stepNumber).toBe(steps.length);
  });
});

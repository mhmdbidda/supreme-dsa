import { describe, expect, it } from "vitest";
import { linearSearch } from "../src/algorithms/searching/linearSearch";
import { summarizeSearchProgress } from "../src/lib/progress";

describe("linearSearch", () => {
  const input = [10, 20, 30, 40, 50];

  it("finds the first item", () => {
    const outcome = linearSearch(input, 10);
    expect(outcome.result).toBe(0);
    expect(outcome.counters.comparisons).toBe(1);
    expect(outcome.refusedUnsortedInput).toBe(false);
  });

  it("finds the middle item", () => {
    const outcome = linearSearch(input, 30);
    expect(outcome.result).toBe(2);
    expect(outcome.counters.comparisons).toBe(3);
  });

  it("finds the last item", () => {
    const outcome = linearSearch(input, 50);
    expect(outcome.result).toBe(4);
    expect(outcome.counters.comparisons).toBe(5);
  });

  it("reports a missing value after scanning every item", () => {
    const outcome = linearSearch(input, 99);
    expect(outcome.result).toBeNull();
    expect(outcome.counters.comparisons).toBe(5);
    expect(outcome.steps[outcome.steps.length - 1].description).toContain(
      "Not found",
    );
  });

  it("stops at the first duplicate", () => {
    const outcome = linearSearch([4, 2, 4, 4, 1], 4);
    expect(outcome.result).toBe(0);
    expect(outcome.counters.comparisons).toBe(1);
  });

  it("handles an empty array", () => {
    const outcome = linearSearch([], 7);
    expect(outcome.result).toBeNull();
    expect(outcome.counters.comparisons).toBe(0);
    expect(outcome.steps).toHaveLength(1);
    expect(outcome.steps[0].description).toContain("Empty array");
  });

  it("handles a single item", () => {
    expect(linearSearch([7], 7)).toMatchObject({ result: 0 });
    expect(linearSearch([7], 7).counters.comparisons).toBe(1);

    const missing = linearSearch([7], 3);
    expect(missing.result).toBeNull();
    expect(missing.counters.comparisons).toBe(1);
  });

  it("does not mutate the input array", () => {
    const values = [5, -1, 3, 3, 0];
    const snapshot = [...values];
    const outcome = linearSearch(values, 3);
    expect(values).toEqual(snapshot);
    expect(outcome.steps[0].array).not.toBe(values);
    for (const step of outcome.steps) {
      expect(step.array).toEqual(snapshot);
    }
  });

  it("counts comparisons on a known example", () => {
    // [4, 2, 7, 1] looking for 7: 4 ≠ 7, 2 ≠ 7, 7 = 7 → 3 comparisons.
    expect(linearSearch([4, 2, 7, 1], 7).counters.comparisons).toBe(3);
    // Missing value → one comparison per item.
    expect(linearSearch([4, 2, 7, 1], 5).counters.comparisons).toBe(4);
  });

  it("marks the found index on the matching step and the final step", () => {
    const outcome = linearSearch([10, 20, 30], 30);
    const matching = outcome.steps.find((step) => step.foundIndex !== undefined);
    expect(matching?.foundIndex).toBe(2);
    expect(matching?.activeIndices).toEqual([2]);
    expect(matching?.comparedIndices).toEqual([2]);

    const last = outcome.steps[outcome.steps.length - 1];
    expect(last.foundIndex).toBe(outcome.result);
    expect(last.array).toEqual([10, 20, 30]);
  });

  it("live progress counters match the algorithm totals at the last step", () => {
    const outcome = linearSearch([4, -1, 4, 9, 2], 9);
    const progress = summarizeSearchProgress(outcome.steps, outcome.steps.length - 1);
    expect(progress.comparisons).toBe(outcome.counters.comparisons);
    expect(progress.swaps).toBe(0);
    expect(progress.stepNumber).toBe(outcome.steps.length);
  });
});

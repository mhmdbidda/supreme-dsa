import { describe, expect, it } from "vitest";
import { binarySearch } from "../src/algorithms/searching/binarySearch";
import { summarizeSearchProgress } from "../src/lib/progress";

const sorted = [1, 3, 5, 7, 9];

describe("binarySearch", () => {
  it("finds the first item", () => {
    const outcome = binarySearch(sorted, 1);
    expect(outcome.result).toBe(0);
    // mid 5 > 1 → right edge, mid 1 = 1. The sortedness pre-check is a
    // validation pass and is not counted.
    expect(outcome.counters.comparisons).toBe(2);
    expect(outcome.refusedUnsortedInput).toBe(false);
  });

  it("finds the middle item", () => {
    const outcome = binarySearch(sorted, 5);
    expect(outcome.result).toBe(2);
    expect(outcome.counters.comparisons).toBe(1);
  });

  it("finds the last item", () => {
    const outcome = binarySearch(sorted, 9);
    expect(outcome.result).toBe(4);
    expect(outcome.counters.comparisons).toBe(3);
  });

  it("reports a missing value with an exhausted window", () => {
    const outcome = binarySearch(sorted, 4);
    expect(outcome.result).toBeNull();
    expect(outcome.counters.comparisons).toBe(3);

    const last = outcome.steps[outcome.steps.length - 1];
    expect(last.description).toContain("Not found");
    expect(last.foundIndex).toBeUndefined();
    // The exhausted window (low above high) leaves every bar outside it.
    expect(last.low as number).toBeGreaterThan(last.high as number);
  });

  it("handles duplicates by returning an index that holds the target", () => {
    const values = [2, 2, 2, 5, 5];
    const foundFive = binarySearch(values, 5);
    expect(foundFive.result).not.toBeNull();
    expect(values[foundFive.result as number]).toBe(5);

    const foundTwo = binarySearch(values, 2);
    expect(foundTwo.result).not.toBeNull();
    expect(values[foundTwo.result as number]).toBe(2);
  });

  it("handles an empty array", () => {
    const outcome = binarySearch([], 7);
    expect(outcome.result).toBeNull();
    expect(outcome.counters.comparisons).toBe(0);
    expect(outcome.steps).toHaveLength(1);
    expect(outcome.steps[0].description).toContain("Empty array");
    expect(outcome.refusedUnsortedInput).toBe(false);
  });

  it("handles a single item", () => {
    const hit = binarySearch([7], 7);
    expect(hit.result).toBe(0);
    expect(hit.counters.comparisons).toBe(1);

    const miss = binarySearch([7], 3);
    expect(miss.result).toBeNull();
    expect(miss.counters.comparisons).toBe(1);
  });

  it("refuses unsorted input instead of searching it", () => {
    const values = [3, 1, 2];
    const snapshot = [...values];
    const outcome = binarySearch(values, 1);

    expect(outcome.refusedUnsortedInput).toBe(true);
    expect(outcome.result).toBeNull();
    expect(outcome.counters.comparisons).toBe(0);
    expect(outcome.steps).toHaveLength(1);
    expect(outcome.steps[0].description).toContain("not sorted");
    expect(outcome.steps[0].comparedIndices).toBeUndefined();
    expect(outcome.steps[0].array).toEqual(snapshot);
    expect(values).toEqual(snapshot);
  });

  it("refuses a reverse sorted array", () => {
    const outcome = binarySearch([5, 4, 3, 2, 1], 3);
    expect(outcome.refusedUnsortedInput).toBe(true);
    expect(outcome.counters.comparisons).toBe(0);
    expect(outcome.result).toBeNull();
  });

  it("does not mutate the input array", () => {
    const values = [1, 3, 5, 7, 9];
    const snapshot = [...values];
    const outcome = binarySearch(values, 7);
    expect(values).toEqual(snapshot);
    expect(outcome.steps[0].array).not.toBe(values);
    for (const step of outcome.steps) {
      expect(step.array).toEqual(snapshot);
    }
  });

  it("tracks low, high and mid on each probe", () => {
    const outcome = binarySearch(sorted, 9);
    const probes = outcome.steps.filter((step) => step.mid !== undefined);
    expect(probes.length).toBe(3);
    expect(probes[0]).toMatchObject({ low: 0, high: 4, mid: 2 });
    expect(probes[1]).toMatchObject({ low: 3, high: 4, mid: 3 });
    expect(probes[2]).toMatchObject({ low: 4, high: 4, mid: 4, foundIndex: 4 });
    for (const probe of probes) {
      expect(probe.activeIndices).toEqual([probe.mid]);
      expect(probe.comparedIndices).toEqual([probe.mid]);
    }
  });

  it("live progress counters match the algorithm totals at the last step", () => {
    const outcome = binarySearch([1, 3, 5, 7, 9, 11, 13], 13);
    const progress = summarizeSearchProgress(outcome.steps, outcome.steps.length - 1);
    expect(progress.comparisons).toBe(outcome.counters.comparisons);
    expect(progress.swaps).toBe(0);
    expect(progress.stepNumber).toBe(outcome.steps.length);
  });
});

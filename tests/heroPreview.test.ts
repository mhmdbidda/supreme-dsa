import { describe, expect, it } from "vitest";
import { bubbleSort } from "../src/algorithms/sorting/bubbleSort";
import { HERO_SORT_INPUT, nextHeroFrame } from "../src/lib/heroPreview";
import { summarizeProgress } from "../src/lib/progress";

describe("HERO_SORT_INPUT (landing hero preview data)", () => {
  const input = [...HERO_SORT_INPUT];

  it("runs through the real bubble sort engine without being mutated", () => {
    const { result, steps } = bubbleSort(input);
    expect(steps[0].array).toEqual(input);
    expect(result).toEqual([...input].sort((a, b) => a - b));
    // The engine must never touch the caller's array — the preview's input
    // has to stay identical on every replay.
    expect(input).toEqual([...HERO_SORT_INPUT]);
  });

  it("records enough frames to animate and ends fully sorted", () => {
    const { steps } = bubbleSort(input);
    expect(steps.length).toBeGreaterThan(2);
    const last = steps[steps.length - 1];
    expect(last.array).toEqual([...input].sort((a, b) => a - b));
    expect(last.sortedIndices).toHaveLength(input.length);
  });

  it("shows the engine's own counters on the preview's final frame", () => {
    const { steps, counters } = bubbleSort(input);
    const progress = summarizeProgress(steps, steps.length - 1);
    expect(progress.comparisons).toBe(counters.comparisons);
    expect(progress.swaps).toBe(counters.swaps);
    expect(progress.totalSteps).toBe(steps.length);
    // The preview only loops over streams that actually do something.
    expect(progress.comparisons).toBeGreaterThan(0);
    expect(progress.swaps).toBeGreaterThan(0);
  });
});

describe("nextHeroFrame", () => {
  it("advances one frame at a time", () => {
    expect(nextHeroFrame(0, 5)).toBe(1);
    expect(nextHeroFrame(3, 5)).toBe(4);
  });

  it("wraps from the last frame back to the first so the preview loops", () => {
    expect(nextHeroFrame(4, 5)).toBe(0);
  });

  it("holds frame 0 for streams with fewer than two frames", () => {
    expect(nextHeroFrame(0, 0)).toBe(0);
    expect(nextHeroFrame(3, 0)).toBe(0);
    expect(nextHeroFrame(2, 1)).toBe(0);
    expect(nextHeroFrame(0, Number.NaN)).toBe(0);
    expect(nextHeroFrame(0, -4)).toBe(0);
  });

  it("falls back to a valid frame for unusable indexes", () => {
    expect(nextHeroFrame(Number.NaN, 4)).toBe(1);
    expect(nextHeroFrame(-3, 4)).toBe(1);
    expect(nextHeroFrame(Number.POSITIVE_INFINITY, 4)).toBe(1);
    // An index past the end still lands inside the stream — never NaN.
    expect(nextHeroFrame(10, 4)).toBe(3);
  });
});

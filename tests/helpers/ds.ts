import { expect } from "vitest";
import type { DSOutcome, DSSnapshot } from "../../src/algorithms/data-structures/types";

/**
 * Shared assertions for the data-structure engine tests. Every operation —
 * success or error — must satisfy the step-stream contract documented in
 * `src/algorithms/data-structures/types.ts`:
 * - at least one snapshot,
 * - every snapshot carries fresh `items` / `highlight` arrays (never
 *   aliases of another snapshot's arrays),
 * - every `highlight` index and every named pointer index is a valid
 *   position inside the SAME snapshot's `items`,
 * - the LAST snapshot always equals the structure's live state.
 */
export function expectConsistentOutcome(
  outcome: DSOutcome,
  state: number[],
): void {
  expect(outcome.steps.length).toBeGreaterThan(0);

  for (const step of outcome.steps) {
    expect(Array.isArray(step.items)).toBe(true);
    expect(Array.isArray(step.highlight)).toBe(true);
    expect(typeof step.description).toBe("string");

    // Indices rendered against `items` must exist in `items` — a snapshot
    // whose read collapsed mid-operation (e.g. a half-reversed list) would
    // leave pointers or highlights pointing past the end.
    for (const index of step.highlight) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(step.items.length);
    }
    for (const index of Object.values(step.pointers)) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(step.items.length);
    }
  }

  // Snapshots are copies, never aliases of each other — no two steps may
  // share an `items` or `highlight` reference.
  for (let a = 0; a < outcome.steps.length; a += 1) {
    for (let b = a + 1; b < outcome.steps.length; b += 1) {
      expect(outcome.steps[a].items).not.toBe(outcome.steps[b].items);
      expect(outcome.steps[a].highlight).not.toBe(outcome.steps[b].highlight);
    }
  }

  // The final step snapshot equals the structure's state after the operation.
  expect(outcome.steps[outcome.steps.length - 1].items).toEqual(state);
}

/**
 * Returns a guard function. Calling it asserts that every snapshot of
 * `outcome` is still byte-for-byte what it was when the operation ended —
 * later steps (of the same operation) and later operations must never
 * mutate an earlier snapshot.
 */
export function expectNoMutation(outcome: DSOutcome): () => void {
  const frozen: DSSnapshot[] = structuredClone(outcome.steps);
  return () => expect(outcome.steps).toEqual(frozen);
}

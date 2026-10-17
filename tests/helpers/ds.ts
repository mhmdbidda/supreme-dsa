import { expect } from "vitest";
import type { DSOutcome, DSSnapshot } from "../../src/algorithms/data-structures/types";

/**
 * Shared assertions for the data-structure engine tests. Every operation —
 * success or error — must satisfy the step-stream contract documented in
 * `src/algorithms/data-structures/types.ts`:
 * - at least one snapshot,
 * - every snapshot carries fresh `items` / `highlight` arrays (never
 *   aliases of another snapshot's arrays),
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
  }

  // Snapshots are copies, never aliases of each other.
  for (let index = 1; index < outcome.steps.length; index += 1) {
    expect(outcome.steps[index].items).not.toBe(outcome.steps[index - 1].items);
    expect(outcome.steps[index].highlight).not.toBe(
      outcome.steps[index - 1].highlight,
    );
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

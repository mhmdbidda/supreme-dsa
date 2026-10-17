import { expect } from "vitest";
import type { VisualBST } from "../../src/algorithms/trees/bst";
import type { TreeOutcome, TreeSnapshot } from "../../src/algorithms/trees/types";

/** In-order read of a plain snapshot (ascending for a valid BST). */
export function snapshotInorder(node: TreeSnapshot | null): number[] {
  if (node === null) return [];
  return [...snapshotInorder(node.left), node.value, ...snapshotInorder(node.right)];
}

/**
 * Shared assertions for the tree engine tests. Every operation — success
 * or error — must satisfy the step-stream contract documented in
 * `src/algorithms/trees/types.ts`:
 * - at least one snapshot,
 * - every snapshot carries a freshly deep-copied `tree` and fresh
 *   `highlight` / `visitOrder` arrays (never aliases of another snapshot),
 * - the LAST snapshot is structurally identical to the live tree.
 */
export function expectConsistentTreeOutcome(
  outcome: TreeOutcome,
  tree: VisualBST,
): void {
  expect(outcome.steps.length).toBeGreaterThan(0);

  for (const step of outcome.steps) {
    expect(Array.isArray(step.highlight)).toBe(true);
    expect(typeof step.description).toBe("string");
    if (step.visitOrder !== undefined) expect(Array.isArray(step.visitOrder)).toBe(true);
  }

  // Snapshots are deep copies, never aliases of each other.
  for (let index = 1; index < outcome.steps.length; index += 1) {
    expect(outcome.steps[index].tree).not.toBe(outcome.steps[index - 1].tree);
    expect(outcome.steps[index].highlight).not.toBe(
      outcome.steps[index - 1].highlight,
    );
    if (
      outcome.steps[index].visitOrder !== undefined &&
      outcome.steps[index - 1].visitOrder !== undefined
    ) {
      expect(outcome.steps[index].visitOrder).not.toBe(
        outcome.steps[index - 1].visitOrder,
      );
    }
  }

  // The final step snapshot equals the tree state after the operation.
  expect(outcome.steps[outcome.steps.length - 1].tree).toEqual(tree.toSnapshot());
}

/**
 * Returns a guard function. Calling it asserts that every snapshot of
 * `outcome` is still byte-for-byte what it was when the operation ended —
 * later steps (of the same operation) and later operations must never
 * mutate an earlier snapshot.
 */
export function expectNoTreeMutation(outcome: TreeOutcome): () => void {
  const frozen: TreeOutcome = structuredClone(outcome);
  return () => expect(outcome.steps).toEqual(frozen.steps);
}

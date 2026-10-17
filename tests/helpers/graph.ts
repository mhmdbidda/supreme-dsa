import { expect } from "vitest";
import type { Graph } from "../../src/algorithms/graphs/graph";
import type { GraphTraversalOutcome } from "../../src/algorithms/graphs/types";

/**
 * Shared assertions for the graph engine tests. Every traversal — success or
 * refusal — must satisfy the step-stream contract documented in
 * `src/algorithms/graphs/types.ts`:
 * - at least one step,
 * - every step carries fresh `visited` / `frontier` / `order` arrays (never
 *   aliases of another step) with no duplicate ids,
 * - the LAST step's `order` equals the traversal result order.
 */
export function expectConsistentGraphOutcome(outcome: GraphTraversalOutcome): void {
  expect(outcome.steps.length).toBeGreaterThan(0);

  for (const step of outcome.steps) {
    expect(Array.isArray(step.visited)).toBe(true);
    expect(Array.isArray(step.frontier)).toBe(true);
    expect(Array.isArray(step.order)).toBe(true);
    expect(typeof step.description).toBe("string");
    expect(new Set(step.visited).size).toBe(step.visited.length);
    expect(new Set(step.order).size).toBe(step.order.length);
  }

  // Snapshots are deep copies, never aliases of each other.
  for (let index = 1; index < outcome.steps.length; index += 1) {
    expect(outcome.steps[index].visited).not.toBe(outcome.steps[index - 1].visited);
    expect(outcome.steps[index].frontier).not.toBe(outcome.steps[index - 1].frontier);
    expect(outcome.steps[index].order).not.toBe(outcome.steps[index - 1].order);
  }

  const last = outcome.steps[outcome.steps.length - 1];
  expect(last.order).toEqual(outcome.result.order);
}

/**
 * Returns a guard that asserts every snapshot of `outcome` is still exactly
 * what it was when the traversal ended. Later steps, later traversals and
 * later graph edits must never rewrite an earlier step stream.
 */
export function expectNoGraphMutation(outcome: GraphTraversalOutcome): () => void {
  const frozen: GraphTraversalOutcome = structuredClone(outcome);
  return () => expect(outcome).toEqual(frozen);
}

/** Stable string fingerprint of the live graph, for before/after comparisons. */
export function graphFingerprint(graph: Graph): string {
  return JSON.stringify({
    directed: graph.isDirected(),
    weighted: graph.isWeighted(),
    edges: graph.edgeList(),
  });
}

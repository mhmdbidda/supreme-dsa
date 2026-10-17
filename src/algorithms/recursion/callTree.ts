import type { RecursionStep } from "./types";

/**
 * One node of the reconstructed call tree, derived purely from the step
 * stream (a `call` step creates a node, the matching `return` step closes
 * it with its return value). The UI feeds it the steps shown SO FAR, so
 * the tree literally grows as the recursion is played back.
 */
export type CallTreeNode = {
  id: number;
  fn: string;
  params: string;
  depth: number;
  isBaseCase: boolean;
  /** "open" while the frame is on the stack, "returned" once it pops. */
  status: "open" | "returned";
  returnValue?: number | string;
  children: number[];
};

/**
 * Rebuilds the call tree from a step stream.
 *
 * Every `call` step appends a node (attached to the currently open parent,
 * or to the roots when depth is 1); the next `return` step closes the
 * innermost open node — matching the LIFO discipline of the recorded
 * stack. A malformed stream (a return with nothing open) is skipped
 * defensively instead of throwing.
 */
export function buildCallTree(steps: readonly RecursionStep[]): CallTreeNode[] {
  const nodes: CallTreeNode[] = [];
  const open: number[] = [];

  for (const step of steps) {
    if (step.event === "call") {
      const id = nodes.length;
      const parentId = open.length > 0 ? open[open.length - 1] : null;
      nodes.push({
        id,
        fn: step.fn,
        params: step.params,
        depth: step.depth,
        isBaseCase: step.isBaseCase === true,
        status: "open",
        children: [],
      });
      if (parentId !== null) nodes[parentId].children.push(id);
      open.push(id);
      continue;
    }

    const id = open.pop();
    if (id === undefined) continue;
    const node = nodes[id];
    node.status = "returned";
    node.returnValue = step.returnValue;
  }

  return nodes;
}

/**
 * How many times each `params` string was called, counting only the call
 * steps shown so far. Params with a count above 1 are the REPEATED
 * SUBPROBLEMS — the whole point of watching naive Fibonacci recurse.
 */
export function countCallsByParams(
  steps: readonly RecursionStep[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const step of steps) {
    if (step.event !== "call") continue;
    counts.set(step.params, (counts.get(step.params) ?? 0) + 1);
  }
  return counts;
}

/**
 * Live totals for the counters panel: calls made and the deepest stack
 * reached among the steps shown so far. Zero before the first step.
 */
export function summarizeRecursionProgress(
  steps: readonly RecursionStep[],
  index: number,
): { calls: number; maxDepth: number } {
  let calls = 0;
  let maxDepth = 0;
  const last = Math.min(Math.max(index, 0), steps.length - 1);
  for (let i = 0; i <= last; i += 1) {
    const step = steps[i];
    if (step.event !== "call") continue;
    calls += 1;
    maxDepth = Math.max(maxDepth, step.depth);
  }
  return { calls, maxDepth };
}

import { describe, expect, it } from "vitest";
import {
  buildCallTree,
  countCallsByParams,
  summarizeRecursionProgress,
} from "../src/algorithms/recursion/callTree";
import { factorial } from "../src/algorithms/recursion/factorial";
import { fibonacci } from "../src/algorithms/recursion/fibonacci";
import { recursiveBinarySearch } from "../src/algorithms/recursion/recursiveBinarySearch";
import { bstInorder } from "../src/algorithms/recursion/bstInorder";
import type { RecursionOutcome, RecursionStep } from "../src/algorithms/recursion/types";
import { VisualBST } from "../src/algorithms/trees/bst";
import type { TreeSnapshot } from "../src/algorithms/trees/types";

/**
 * Shared step-contract assertions (see `src/algorithms/recursion/types.ts`):
 * every run — success only here, since refusals never run — records one
 * push and one pop per frame, deep-copies the stack on every step, and
 * ends with an empty stack (the recursion has fully unwound).
 */
function expectWellFormedSteps(outcome: RecursionOutcome): void {
  expect(outcome.error).toBeUndefined();
  expect(outcome.steps.length).toBeGreaterThan(0);

  let previousStack: RecursionStep["stack"] | null = null;
  for (const step of outcome.steps) {
    expect(step.depth).toBeGreaterThanOrEqual(1);
    expect(typeof step.description).toBe("string");
    expect(typeof step.fn).toBe("string");
    expect(typeof step.params).toBe("string");
    expect(Array.isArray(step.stack)).toBe(true);

    if (step.event === "call") {
      // The new frame is on top and `depth` is the post-push height.
      expect(step.stack).toHaveLength(step.depth);
      expect(step.stack[step.stack.length - 1]).toEqual({ fn: step.fn, params: step.params });
      expect(step.returnValue).toBeUndefined();
    } else {
      // The frame already popped: the stack is the remaining height.
      expect(step.stack).toHaveLength(step.depth - 1);
      expect(step.returnValue !== undefined).toBe(true);
    }

    // Stacks are deep copies — never aliased between steps.
    expect(step.stack).not.toBe(previousStack);
    for (const frame of step.stack) expect(frame).not.toBe(previousStack?.[0]);
    previousStack = step.stack;
  }

  // The outermost pop leaves the stack empty.
  expect(outcome.steps[outcome.steps.length - 1].stack).toHaveLength(0);

  // Counters agree with the step stream.
  const calls = outcome.steps.filter((step) => step.event === "call");
  const returns = outcome.steps.filter((step) => step.event === "return");
  expect(outcome.counters.calls).toBe(calls.length);
  expect(returns.length).toBe(calls.length);
  expect(outcome.counters.maxDepth).toBe(Math.max(...calls.map((step) => step.depth)));
}

function makeSampleTree(): TreeSnapshot | null {
  const bst = new VisualBST();
  bst.insertAll([50, 30, 70, 20, 40, 60, 80]);
  return bst.toSnapshot();
}

describe("factorial", () => {
  it("computes the classic values", () => {
    expect(factorial(0).result).toBe(1);
    expect(factorial(1).result).toBe(1);
    expect(factorial(5).result).toBe(120);
    expect(factorial(12).result).toBe(479001600);
  });

  it("records one call per level and matches the step contract", () => {
    const outcome = factorial(5);
    expectWellFormedSteps(outcome);
    // fact(5) … fact(0) — six frames, six pops, depth six at the bottom.
    expect(outcome.counters.calls).toBe(6);
    expect(outcome.counters.maxDepth).toBe(6);
    expect(outcome.steps).toHaveLength(12);
  });

  it("labels the base case and returns 1 from it", () => {
    const outcome = factorial(3);
    const baseCalls = outcome.steps.filter(
      (step) => step.event === "call" && step.isBaseCase === true,
    );
    expect(baseCalls).toHaveLength(1);
    expect(baseCalls[0].params).toBe("n = 0");
    const baseReturn = outcome.steps.find(
      (step) => step.event === "return" && step.params === "n = 0",
    );
    expect(baseReturn?.returnValue).toBe(1);
  });

  it("rejects out-of-range input without running", () => {
    for (const bad of [13, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const outcome = factorial(bad);
      expect(outcome.error).toBeDefined();
      expect(outcome.result).toBeNull();
      expect(outcome.steps).toHaveLength(0);
      expect(outcome.counters).toEqual({ calls: 0, maxDepth: 0 });
    }
  });
});

describe("fibonacci", () => {
  it("computes the classic values", () => {
    expect(fibonacci(0).result).toBe(0);
    expect(fibonacci(1).result).toBe(1);
    expect(fibonacci(5).result).toBe(5);
    expect(fibonacci(10).result).toBe(55);
  });

  it("fib(5) makes exactly 15 calls", () => {
    const outcome = fibonacci(5);
    expect(outcome.counters.calls).toBe(15);
    expectWellFormedSteps(outcome);
  });

  it("fib(10) makes 177 calls and the counters match the stream", () => {
    const outcome = fibonacci(10);
    expect(outcome.counters.calls).toBe(177); // 2·fib(11) − 1
    const calls = outcome.steps.filter((step) => step.event === "call");
    expect(calls).toHaveLength(177);
  });

  it("labels both base cases and reaches the documented depth", () => {
    const outcome = fibonacci(5);
    // fib(5) → fib(4) → fib(3) → fib(2) → fib(1): five frames at the peak.
    expect(outcome.counters.maxDepth).toBe(5);
    const baseParams = new Set(
      outcome.steps
        .filter((step) => step.event === "call" && step.isBaseCase === true)
        .map((step) => step.params),
    );
    expect(baseParams).toEqual(new Set(["n = 0", "n = 1"]));
  });

  it("rejects out-of-range input without running", () => {
    for (const bad of [11, -2, 4.5, Number.NaN]) {
      const outcome = fibonacci(bad);
      expect(outcome.error).toBeDefined();
      expect(outcome.result).toBeNull();
      expect(outcome.steps).toHaveLength(0);
      expect(outcome.counters).toEqual({ calls: 0, maxDepth: 0 });
    }
  });
});

describe("recursiveBinarySearch", () => {
  it("finds a present target and reports its index", () => {
    const outcome = recursiveBinarySearch([1, 3, 5, 7, 9], 7);
    expect(outcome.result).toBe(3);
    expectWellFormedSteps(outcome);
    const last = outcome.steps[outcome.steps.length - 1];
    expect(last.returnValue).toBe(3);
  });

  it("reports null for a missing target", () => {
    const outcome = recursiveBinarySearch([1, 3, 5, 7, 9], 4);
    expect(outcome.result).toBeNull();
    expect(outcome.error).toBeUndefined();
    expectWellFormedSteps(outcome);
    const notFound = outcome.steps.filter(
      (step) => step.event === "return" && step.returnValue === -1,
    );
    expect(notFound.length).toBeGreaterThan(0);
  });

  it("handles the empty window on an empty array", () => {
    const outcome = recursiveBinarySearch([], 5);
    expect(outcome.result).toBeNull();
    expect(outcome.counters.calls).toBe(1);
    expect(outcome.steps[0].isBaseCase).toBe(true);
    expect(outcome.steps[0].stack).toHaveLength(1);
    expect(outcome.steps[1].stack).toHaveLength(0);
  });

  it("refuses unsorted input without running", () => {
    const outcome = recursiveBinarySearch([5, 1, 9, 3], 3);
    expect(outcome.error).toBeDefined();
    expect(outcome.steps).toHaveLength(0);
    expect(outcome.counters).toEqual({ calls: 0, maxDepth: 0 });
  });

  it("refuses oversized arrays and non-finite targets without running", () => {
    const big = Array.from({ length: 31 }, (_, i) => i + 1);
    const oversized = recursiveBinarySearch(big, 4);
    expect(oversized.error).toBeDefined();
    expect(oversized.steps).toHaveLength(0);

    const badTarget = recursiveBinarySearch([1, 2, 3], Number.NaN);
    expect(badTarget.error).toBeDefined();
    expect(badTarget.steps).toHaveLength(0);

    const badElement = recursiveBinarySearch([1, Number.POSITIVE_INFINITY, 3], 2);
    expect(badElement.error).toBeDefined();
    expect(badElement.steps).toHaveLength(0);
  });

  it("never mutates the searched array — even a frozen one", () => {
    const input = Object.freeze([2, 4, 6, 8, 10]) as unknown as number[];
    const snapshot = [...input];
    const outcome = recursiveBinarySearch(input, 8);
    expect(outcome.result).toBe(3);
    expect(input).toEqual(snapshot);
  });
});

describe("bstInorder", () => {
  it("visits the sample tree in ascending order", () => {
    const outcome = bstInorder(makeSampleTree());
    expect(outcome.result).toEqual([20, 30, 40, 50, 60, 70, 80]);
    expectWellFormedSteps(outcome);
  });

  it("calls the base case once per missing child and counts depth by height", () => {
    const outcome = bstInorder(makeSampleTree());
    // 7 nodes + 8 null children (the sample tree has 8 links). Nodes reach
    // depth 3; the null base cases under the leaves sit one level deeper.
    expect(outcome.counters.calls).toBe(15);
    expect(outcome.counters.maxDepth).toBe(4);
    const nullCalls = outcome.steps.filter(
      (step) => step.event === "call" && step.params === "node = null",
    );
    expect(nullCalls).toHaveLength(8);
    for (const step of nullCalls) expect(step.isBaseCase).toBe(true);
  });

  it("refuses an empty tree without running", () => {
    const outcome = bstInorder(null);
    expect(outcome.error).toBeDefined();
    expect(outcome.result).toBeNull();
    expect(outcome.steps).toHaveLength(0);
  });

  it("refuses trees above the node limit without running", () => {
    const bst = new VisualBST();
    bst.insertAll(Array.from({ length: 31 }, (_, i) => i + 1));
    const outcome = bstInorder(bst.toSnapshot());
    expect(outcome.error).toBeDefined();
    expect(outcome.steps).toHaveLength(0);
    expect(outcome.counters).toEqual({ calls: 0, maxDepth: 0 });
  });

  it("does not mutate the tree snapshot", () => {
    const tree = makeSampleTree();
    const frozen = structuredClone(tree);
    const outcome = bstInorder(tree);
    expect(outcome.result).toEqual([20, 30, 40, 50, 60, 70, 80]);
    expect(tree).toEqual(frozen);
  });
});

describe("step immutability", () => {
  it("earlier steps are never rewritten by later ones", () => {
    const outcome = fibonacci(5);
    const frozen = structuredClone(outcome.steps);
    // Mutating one step's stack must not leak into any other step.
    outcome.steps[0].stack.push({ fn: "ghost", params: "n = 99" });
    for (let i = 1; i < outcome.steps.length; i += 1) {
      expect(outcome.steps[i]).toEqual(frozen[i]);
    }
  });

  it("a second run never shares state with the first", () => {
    const first = factorial(6);
    const second = factorial(6);
    expect(second.steps).toEqual(first.steps);
    for (let i = 0; i < first.steps.length; i += 1) {
      expect(second.steps[i].stack).not.toBe(first.steps[i].stack);
    }
  });
});

describe("buildCallTree", () => {
  it("rebuilds the Fibonacci call tree with repeated subproblems", () => {
    const outcome = fibonacci(3);
    const nodes = buildCallTree(outcome.steps);

    // fib(3), fib(2), fib(1), fib(0), fib(1) — five frames.
    expect(nodes).toHaveLength(5);
    expect(nodes[0]).toMatchObject({ params: "n = 3", depth: 1, status: "returned" });
    expect(nodes[0].returnValue).toBe(2);
    expect(nodes[0].children).toHaveLength(2);

    // Every node closed with its return value.
    for (const node of nodes) expect(node.status).toBe("returned");
    expect(nodes.filter((node) => node.isBaseCase)).toHaveLength(3);

    // fib(1) was called twice — the repeated subproblem the lab points out.
    const counts = countCallsByParams(outcome.steps);
    expect(counts.get("n = 1")).toBe(2);
    expect(counts.get("n = 3")).toBe(1);
  });

  it("grows as steps are consumed", () => {
    const outcome = fibonacci(3);
    const partial = buildCallTree(outcome.steps.slice(0, 3));
    expect(partial).toHaveLength(3);
    // The root has not returned yet.
    expect(partial[0].status).toBe("open");
    expect(partial[0].returnValue).toBeUndefined();
    // The innermost frame is still open too.
    expect(partial[2].status).toBe("open");
  });

  it("factorial builds a single chain", () => {
    const nodes = buildCallTree(factorial(3).steps);
    expect(nodes).toHaveLength(4);
    for (const node of nodes) expect(node.children.length).toBeLessThanOrEqual(1);
    expect(nodes[0].children).toEqual([1]);
    expect(nodes[1].children).toEqual([2]);
    expect(nodes[2].children).toEqual([3]);
  });
});

describe("summarizeRecursionProgress", () => {
  it("grows with playback and matches the final counters", () => {
    const outcome = fibonacci(5);
    const last = outcome.steps.length - 1;
    expect(summarizeRecursionProgress(outcome.steps, last)).toEqual({
      calls: 15,
      maxDepth: 5,
    });
    expect(summarizeRecursionProgress(outcome.steps, 0)).toEqual({ calls: 1, maxDepth: 1 });
    // Out-of-range indices clamp to the first step, like lib/progress.ts.
    expect(summarizeRecursionProgress(outcome.steps, -5)).toEqual({ calls: 1, maxDepth: 1 });
  });
});

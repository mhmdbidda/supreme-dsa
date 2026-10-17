import { describe, expect, it } from "vitest";
import { VisualBST } from "../src/algorithms/trees/bst";
import type { TreeSnapshot } from "../src/algorithms/trees/types";
import {
  expectConsistentTreeOutcome,
  expectNoTreeMutation,
} from "./helpers/tree";

/** The canonical sample tree: 50 over 30/70 over 20/40/60/80. */
const SAMPLE = [50, 30, 70, 20, 40, 60, 80];

/** Expected plain snapshot builder, e.g. node(50, node(30), node(70)). */
function node(
  value: number,
  left: TreeSnapshot | null = null,
  right: TreeSnapshot | null = null,
): TreeSnapshot {
  return { value, left, right };
}

function buildSample(): VisualBST {
  const tree = new VisualBST();
  for (const value of SAMPLE) {
    const outcome = tree.insert(value);
    expect(outcome.error).toBeUndefined();
  }
  return tree;
}

const SAMPLE_SNAPSHOT = node(
  50,
  node(30, node(20), node(40)),
  node(70, node(60), node(80)),
);

describe("VisualBST · sample tree traversals", () => {
  it("produces the exact inorder output 20,30,40,50,60,70,80", () => {
    const tree = buildSample();
    const outcome = tree.inorder();

    expect(outcome.error).toBeUndefined();
    expect(outcome.result).toEqual([20, 30, 40, 50, 60, 70, 80]);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("produces the exact preorder output 50,30,20,40,70,60,80", () => {
    const tree = buildSample();
    const outcome = tree.preorder();

    expect(outcome.error).toBeUndefined();
    expect(outcome.result).toEqual([50, 30, 20, 40, 70, 60, 80]);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("produces the exact postorder output 20,40,30,60,80,70,50", () => {
    const tree = buildSample();
    const outcome = tree.postorder();

    expect(outcome.error).toBeUndefined();
    expect(outcome.result).toEqual([20, 40, 30, 60, 80, 70, 50]);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("grows the visit order one value at a time, without mutating it", () => {
    const tree = buildSample();
    const outcome = tree.inorder();
    const orders = outcome.steps
      .map((step) => step.visitOrder)
      .filter((order): order is number[] => order !== undefined);

    expect(orders.length).toBeGreaterThan(0);
    for (let index = 1; index < orders.length; index += 1) {
      expect(orders[index].length).toBeGreaterThanOrEqual(orders[index - 1].length);
      expect(orders[index].slice(0, orders[index - 1].length)).toEqual(orders[index - 1]);
    }
    expect(orders[orders.length - 1]).toEqual([20, 30, 40, 50, 60, 70, 80]);

    // Snapshot visitOrder arrays are copies, never aliases of each other.
    for (let index = 1; index < orders.length; index += 1) {
      expect(orders[index]).not.toBe(orders[index - 1]);
    }
  });

  it("omits the visit order on insert/search/delete steps", () => {
    const tree = buildSample();
    for (const outcome of [tree.insert(45), tree.search(45), tree.deleteValue(45)]) {
      expect(outcome.steps.every((step) => step.visitOrder === undefined)).toBe(true);
    }
  });
});

describe("VisualBST · insert", () => {
  it("builds the sample tree with the expected structure", () => {
    const tree = buildSample();
    expect(tree.toSnapshot()).toEqual(SAMPLE_SNAPSHOT);
    expect(tree.toInorder()).toEqual([20, 30, 40, 50, 60, 70, 80]);
  });

  it("inserts the first value as the root of an empty tree", () => {
    const tree = new VisualBST();
    const outcome = tree.insert(50);

    expect(outcome.result).toBe(50);
    expect(outcome.error).toBeUndefined();
    expect(tree.toSnapshot()).toEqual(node(50));
    expect(outcome.steps[0].description).toMatch(/empty/i);
    expect(outcome.steps[0].description).toMatch(/root/i);
    expect(outcome.steps[outcome.steps.length - 1].highlight).toEqual([50]);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("attaches deeper values on the correct side and counts the walk", () => {
    const tree = buildSample();
    const outcome = tree.insert(45);

    expect(outcome.result).toBe(45);
    // 45 vs 50, 45 vs 30, 45 vs 40 → three comparisons, three nodes visited.
    expect(outcome.counters.comparisons).toBe(3);
    expect(outcome.counters.nodesVisited).toBe(3);
    expect(tree.toSnapshot()).toEqual(
      node(
        50,
        node(30, node(20), node(40, null, node(45))),
        node(70, node(60), node(80)),
      ),
    );
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("rejects a duplicate, leaves the tree unchanged and never throws", () => {
    const tree = buildSample();
    const before = tree.toSnapshot();
    const outcome = tree.insert(40);

    expect(outcome.error).toMatch(/duplicate/i);
    expect(outcome.result).toBeNull();
    expect(tree.toSnapshot()).toEqual(before);
    expect(tree.countNodes()).toBe(7);
    expect(outcome.steps.some((step) => /duplicate/i.test(step.description))).toBe(true);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("refuses a non-finite value without mutating the tree", () => {
    const tree = buildSample();
    const before = tree.toSnapshot();
    const outcome = tree.insert(Number.NaN);

    expect(outcome.error).toBeTruthy();
    expect(outcome.result).toBeNull();
    expect(tree.toSnapshot()).toEqual(before);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("builds the sample tree in one combined stream via insertAll", () => {
    const tree = new VisualBST();
    const outcome = tree.insertAll(SAMPLE);

    expect(outcome.error).toBeUndefined();
    expect(outcome.result).toEqual([20, 30, 40, 50, 60, 70, 80]);
    expect(tree.toSnapshot()).toEqual(SAMPLE_SNAPSHOT);
    // At least a root/attach step pair for each of the seven inserts.
    expect(outcome.steps.length).toBeGreaterThanOrEqual(SAMPLE.length * 2);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("stops insertAll at the first duplicate and reports it", () => {
    const tree = new VisualBST();
    const outcome = tree.insertAll([1, 2, 1]);

    expect(outcome.error).toMatch(/duplicate/i);
    expect(outcome.result).toBeNull();
    expect(tree.toInorder()).toEqual([1, 2]);
    expectConsistentTreeOutcome(outcome, tree);
  });
});

describe("VisualBST · search", () => {
  it("finds a deep value and marks it on the final step", () => {
    const tree = buildSample();
    const outcome = tree.search(80);

    expect(outcome.result).toBe(true);
    expect(outcome.error).toBeUndefined();
    expect(outcome.counters.comparisons).toBe(3);
    expect(outcome.counters.nodesVisited).toBe(3);
    expect(outcome.steps[outcome.steps.length - 1].found).toBe(80);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("finds the root in one comparison", () => {
    const tree = buildSample();
    const outcome = tree.search(50);

    expect(outcome.result).toBe(true);
    expect(outcome.counters.comparisons).toBe(1);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("reports a miss without an error and without mutating the tree", () => {
    const tree = buildSample();
    const before = tree.toSnapshot();
    const outcome = tree.search(45);

    expect(outcome.result).toBe(false);
    expect(outcome.error).toBeUndefined();
    expect(outcome.counters.comparisons).toBe(3);
    expect(outcome.steps[outcome.steps.length - 1].found).toBeUndefined();
    expect(tree.toSnapshot()).toEqual(before);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("refuses to search an empty tree", () => {
    const tree = new VisualBST();
    const outcome = tree.search(5);

    expect(outcome.error).toMatch(/empty/i);
    expect(outcome.result).toBeNull();
    expectConsistentTreeOutcome(outcome, tree);
  });
});

describe("VisualBST · delete", () => {
  it("deletes a leaf (case 1)", () => {
    const tree = buildSample();
    const outcome = tree.deleteValue(20);

    expect(outcome.result).toBe(20);
    expect(outcome.error).toBeUndefined();
    expect(tree.toSnapshot()).toEqual(
      node(50, node(30, null, node(40)), node(70, node(60), node(80))),
    );
    expect(outcome.steps.some((step) => /case 1/i.test(step.description))).toBe(true);
    expect(outcome.steps.some((step) => /leaf/i.test(step.description))).toBe(true);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("deletes a node with a left child only (case 2)", () => {
    const tree = new VisualBST();
    tree.insert(50);
    tree.insert(30);
    tree.insert(20);

    const outcome = tree.deleteValue(30);

    expect(outcome.result).toBe(30);
    expect(tree.toSnapshot()).toEqual(node(50, node(20), null));
    expect(outcome.steps.some((step) => /case 2/i.test(step.description))).toBe(true);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("deletes a node with a right child only (case 2)", () => {
    const tree = new VisualBST();
    tree.insert(20);
    tree.insert(30);
    tree.insert(40);

    const outcome = tree.deleteValue(30);

    expect(outcome.result).toBe(30);
    expect(tree.toSnapshot()).toEqual(node(20, null, node(40)));
    expect(outcome.steps.some((step) => /case 2/i.test(step.description))).toBe(true);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("deletes a node with two children using the inorder successor (case 3)", () => {
    const tree = buildSample();
    const outcome = tree.deleteValue(30);

    expect(outcome.result).toBe(30);
    // Inorder successor of 30 is 40, the minimum of its right subtree.
    expect(tree.toSnapshot()).toEqual(
      node(50, node(40, node(20), null), node(70, node(60), node(80))),
    );
    expect(outcome.steps.some((step) => /case 3/i.test(step.description))).toBe(true);
    expect(outcome.steps.some((step) => /successor is 40/.test(step.description))).toBe(true);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("deletes the root when it has two children (case 3)", () => {
    const tree = buildSample();
    const outcome = tree.deleteValue(50);

    expect(outcome.result).toBe(50);
    // Inorder successor of the root is 60, the minimum of the right subtree.
    expect(tree.toSnapshot()).toEqual(
      node(60, node(30, node(20), node(40)), node(70, null, node(80))),
    );
    expect(tree.toInorder()).toEqual([20, 30, 40, 60, 70, 80]);
    expect(outcome.steps.some((step) => /case 3/i.test(step.description))).toBe(true);
    expect(outcome.steps.some((step) => /successor is 60/.test(step.description))).toBe(true);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("deletes the root leaf and empties the tree", () => {
    const tree = new VisualBST();
    tree.insert(5);

    const outcome = tree.deleteValue(5);

    expect(outcome.result).toBe(5);
    expect(tree.toSnapshot()).toBeNull();
    expect(tree.countNodes()).toBe(0);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("deletes the root with a single child (case 2)", () => {
    const tree = new VisualBST();
    tree.insert(50);
    tree.insert(30);

    const outcome = tree.deleteValue(50);

    expect(outcome.result).toBe(50);
    expect(tree.toSnapshot()).toEqual(node(30));
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("reports a missing value and leaves the tree unchanged", () => {
    const tree = buildSample();
    const before = tree.toSnapshot();
    const outcome = tree.deleteValue(42);

    expect(outcome.error).toMatch(/not in the tree/i);
    expect(outcome.result).toBeNull();
    expect(tree.toSnapshot()).toEqual(before);
    expectConsistentTreeOutcome(outcome, tree);
  });

  it("refuses to delete from an empty tree", () => {
    const tree = new VisualBST();
    const outcome = tree.deleteValue(5);

    expect(outcome.error).toMatch(/empty/i);
    expect(outcome.result).toBeNull();
    expectConsistentTreeOutcome(outcome, tree);
  });
});

describe("VisualBST · height, node count and clear", () => {
  it("reports 0 for the empty tree", () => {
    const tree = new VisualBST();

    expect(tree.height().result).toBe(0);
    expect(tree.nodeCount().result).toBe(0);
    expect(tree.measureHeight()).toBe(0);
    expect(tree.countNodes()).toBe(0);
  });

  it("reports 1 for a single-node tree", () => {
    const tree = new VisualBST();
    tree.insert(5);

    const height = tree.height();
    const count = tree.nodeCount();
    expect(height.result).toBe(1);
    expect(count.result).toBe(1);
    expectConsistentTreeOutcome(height, tree);
    expectConsistentTreeOutcome(count, tree);
  });

  it("reports height 3 and 7 nodes for the sample tree", () => {
    const tree = buildSample();

    expect(tree.height().result).toBe(3);
    expect(tree.nodeCount().result).toBe(7);
    expect(tree.measureHeight()).toBe(3);
    expect(tree.countNodes()).toBe(7);
    expectConsistentTreeOutcome(tree.height(), tree);
    expectConsistentTreeOutcome(tree.nodeCount(), tree);
  });

  it("counts a skewed tree as tall as it is wide", () => {
    const tree = new VisualBST();
    for (const value of [1, 2, 3, 4, 5]) tree.insert(value);

    expect(tree.measureHeight()).toBe(5);
    expect(tree.countNodes()).toBe(5);
    expect(tree.inorder().result).toEqual([1, 2, 3, 4, 5]);
  });

  it("clears the tree and reports how many nodes were removed", () => {
    const tree = buildSample();
    const outcome = tree.clear();

    expect(outcome.result).toBe(7);
    expect(outcome.error).toBeUndefined();
    expect(tree.toSnapshot()).toBeNull();
    expect(tree.countNodes()).toBe(0);
    expectConsistentTreeOutcome(outcome, tree);

    const again = tree.clear();
    expect(again.result).toBe(0);
    expect(again.error).toBeUndefined();
  });
});

describe("VisualBST · ordering and snapshot integrity", () => {
  it("keeps the inorder sequence sorted after random inserts", () => {
    const tree = new VisualBST();
    const inserted: number[] = [];

    for (let index = 0; index < 25; index += 1) {
      const value = Math.floor(Math.random() * 999) + 1;
      if (inserted.includes(value)) continue;
      inserted.push(value);

      const outcome = tree.insert(value);
      expect(outcome.error).toBeUndefined();
      expect(tree.toInorder()).toEqual([...inserted].sort((a, b) => a - b));
    }

    expect(inserted.length).toBeGreaterThan(5);
    expect(tree.countNodes()).toBe(inserted.length);
    expect(tree.inorder().result).toEqual([...inserted].sort((a, b) => a - b));
  });

  it("ends every operation with a snapshot equal to the live tree", () => {
    const tree = buildSample();
    // Each thunk runs one operation; the helper checks its outcome BEFORE
    // the next thunk mutates the tree, so the last snapshot of every stream
    // must match the tree state at that moment.
    const checks: Array<() => ReturnType<VisualBST["insert"]>> = [
      () => tree.insert(45),
      () => tree.search(60),
      () => tree.search(41),
      () => tree.deleteValue(30),
      () => tree.deleteValue(999),
      () => tree.inorder(),
      () => tree.preorder(),
      () => tree.postorder(),
      () => tree.height(),
      () => tree.nodeCount(),
      () => tree.clear(),
    ];
    for (const run of checks) {
      expectConsistentTreeOutcome(run(), tree);
    }
  });

  it("never mutates an earlier snapshot when later operations run", () => {
    const tree = buildSample();
    const insertOutcome = tree.insert(45);
    const deleteOutcome = tree.deleteValue(70);
    const traversalOutcome = tree.inorder();

    const guards = [
      expectNoTreeMutation(insertOutcome),
      expectNoTreeMutation(deleteOutcome),
      expectNoTreeMutation(traversalOutcome),
    ];

    tree.insert(90);
    tree.deleteValue(20);
    tree.search(60);
    tree.postorder();
    tree.clear();

    for (const guard of guards) guard();
  });
});

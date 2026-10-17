import type {
  TreeCounters,
  TreeOperationResult,
  TreeOutcome,
  TreeSnapshot,
  TreeStep,
  TraversalOrder,
} from "./types";

/**
 * A hand-rolled binary tree node: a value plus two child links.
 * `value` is mutable because delete's two-children case copies the inorder
 * successor's value into the removed node's slot (the node object itself
 * stays where it is in the structure).
 */
class TreeNode {
  constructor(
    public value: number,
    public left: TreeNode | null = null,
    public right: TreeNode | null = null,
  ) {}
}

type TraversalRule = {
  name: string;
  rule: string;
};

const TRAVERSAL_RULES: Record<TraversalOrder, TraversalRule> = {
  inorder: {
    name: "In-order",
    rule: "left subtree → node → right subtree",
  },
  preorder: {
    name: "Pre-order",
    rule: "node → left subtree → right subtree",
  },
  postorder: {
    name: "Post-order",
    rule: "left subtree → right subtree → node",
  },
};

/**
 * Binary Search Tree (BST) built BY HAND on its own node type — no
 * built-in collections for any demonstrated operation.
 *
 * Duplicate policy: DUPLICATES ARE REJECTED. `insert` compares against every
 * node on the search path; when it finds an equal value it returns an error
 * and leaves the tree completely unchanged (documented in `types.ts` and
 * shown in the UI).
 *
 * Height is measured as the number of NODES on the longest root-to-leaf
 * path: an empty tree is 0, a single node is 1, and the sample tree
 * (50 over 30/70 over 20/40/60/80) is 3.
 *
 * Every operation records its own immutable step stream; the last step
 * always equals the live tree (`toSnapshot()`), for errors too.
 */
export class VisualBST {
  private root: TreeNode | null = null;

  private steps: TreeStep[] = [];
  private counters: TreeCounters = { nodesVisited: 0, comparisons: 0 };

  // ---------------------------------------------------------------- reads --
  // Pure getters: no steps, no counters — the UI uses these for live stats.

  /** In-order read of the live tree; ascending because it is a BST. */
  toInorder(): number[] {
    const values: number[] = [];
    const stack: TreeNode[] = [];
    let node = this.root;
    while (node !== null || stack.length > 0) {
      while (node !== null) {
        stack.push(node);
        node = node.left;
      }
      node = stack.pop() ?? null;
      if (node !== null) {
        values.push(node.value);
        node = node.right;
      }
    }
    return values;
  }

  /** Deep-copied serializable view of the live tree (never a live reference). */
  toSnapshot(): TreeSnapshot | null {
    return this.copyTree(this.root);
  }

  /** How many nodes the tree holds. O(n). */
  countNodes(): number {
    return this.countIn(this.root);
  }

  /** Height in NODES on the longest root-to-leaf path; empty tree is 0. */
  measureHeight(): number {
    return this.heightIn(this.root);
  }

  // ------------------------------------------------------------- operations --

  /**
   * Inserts `value` on the live tree by walking one root-to-leaf path.
   * Rejects duplicates: an equal value anywhere on the path returns an
   * error and the tree is left unchanged.
   */
  insert(value: number): TreeOutcome {
    this.begin();

    if (!Number.isFinite(value)) {
      this.snapshot(`Insert refused: ${String(value)} is not a finite number.`);
      return this.finish(null, `Insert refused: enter a finite number, e.g. 50.`);
    }

    if (this.root === null) {
      this.root = new TreeNode(value);
      this.snapshot(
        `Insert ${value}: the tree is empty, so ${value} becomes the root.`,
      );
      this.snapshot(`Inserted ${value} as the root of the tree.`, {
        highlight: [value],
      });
      return this.finish(value);
    }

    let current = this.root;
    for (;;) {
      this.counters.nodesVisited += 1;
      this.counters.comparisons += 1;
      this.snapshot(this.compareMessage(value, current), {
        highlight: [current.value],
      });

      if (value === current.value) {
        this.snapshot(
          `Insert refused: ${value} already exists in the tree — duplicates are rejected, the tree is unchanged.`,
          { highlight: [current.value] },
        );
        return this.finish(
          null,
          `Duplicate: ${value} is already in the tree — this tree rejects duplicates, so nothing was changed.`,
        );
      }

      const goesLeft = value < current.value;
      const next = goesLeft ? current.left : current.right;
      const side = goesLeft ? "left" : "right";

      if (next === null) {
        this.snapshot(
          `Reached an empty slot on ${current.value}'s ${side} — attach the new node there.`,
          { highlight: [current.value] },
        );
        const created = new TreeNode(value);
        if (goesLeft) current.left = created;
        else current.right = created;
        this.snapshot(
          `Inserted ${value} as the ${side} child of ${current.value}.`,
          { highlight: [value] },
        );
        return this.finish(value);
      }

      current = next;
    }
  }

  /**
   * Walks one root-to-leaf path looking for `value`.
   * A miss in a NON-empty tree is a normal result (`false`, no error);
   * an empty tree is an error — there is nothing to search.
   */
  search(value: number): TreeOutcome {
    this.begin();

    if (!Number.isFinite(value)) {
      this.snapshot(`Search refused: ${String(value)} is not a finite number.`);
      return this.finish(null, `Search refused: enter a finite number, e.g. 50.`);
    }

    if (this.root === null) {
      this.snapshot(
        `Search refused: the tree is empty, so ${value} cannot be in it.`,
      );
      return this.finish(
        null,
        `The tree is empty — nothing to search for ${value}.`,
      );
    }

    let current = this.root;
    for (;;) {
      this.counters.nodesVisited += 1;
      this.counters.comparisons += 1;
      this.snapshot(this.compareMessage(value, current), {
        highlight: [current.value],
      });

      if (value === current.value) {
        this.snapshot(
          `Found ${value} after ${this.counters.comparisons} comparison${
            this.counters.comparisons === 1 ? "" : "s"
          } along one root-to-leaf path.`,
          { highlight: [value], found: value },
        );
        return this.finish(true);
      }

      const goesLeft = value < current.value;
      const next = goesLeft ? current.left : current.right;
      if (next === null) {
        this.snapshot(
          `${value} is not in the tree — the walk reached an empty slot on ${current.value}'s ${
            goesLeft ? "left" : "right"
          } after ${this.counters.comparisons} comparison${
            this.counters.comparisons === 1 ? "" : "s"
          }.`,
          { highlight: [current.value] },
        );
        return this.finish(false);
      }

      current = next;
    }
  }

  /**
   * Deletes `value`. All three structural cases are handled and NAMED in
   * the step descriptions:
   * - case 1 — leaf (no children): unlink it,
   * - case 2 — one child: the parent links straight past the removed node,
   * - case 3 — two children: replace the node's value with the INORDER
   *   SUCCESSOR (the minimum of the right subtree), then unlink that
   *   successor node from the right subtree.
   * Missing values return an error and leave the tree unchanged.
   */
  deleteValue(value: number): TreeOutcome {
    this.begin();

    if (!Number.isFinite(value)) {
      this.snapshot(`Delete refused: ${String(value)} is not a finite number.`);
      return this.finish(null, `Delete refused: enter a finite number, e.g. 50.`);
    }

    if (this.root === null) {
      this.snapshot(
        `Delete ${value}: the tree is empty, so there is nothing to delete.`,
      );
      return this.finish(
        null,
        `The tree is empty — nothing to delete.`,
      );
    }

    let parent: TreeNode | null = null;
    let current: TreeNode | null = this.root;
    for (;;) {
      if (current === null) {
        this.snapshot(
          `${value} is not in the tree — the walk reached an empty slot; nothing was deleted.`,
        );
        return this.finish(
          null,
          `Value ${value} is not in the tree — nothing was deleted.`,
        );
      }

      this.counters.nodesVisited += 1;
      this.counters.comparisons += 1;
      this.snapshot(this.compareMessage(value, current), {
        highlight: [current.value],
      });

      if (value === current.value) break;

      parent = current;
      current = value < current.value ? current.left : current.right;
    }

    // The loop only breaks on a match, and the match node is never null.
    if (current === null) {
      // Unreachable: the walk above returns instead of breaking on null.
      return this.finish(null, `Value ${value} is not in the tree — nothing was deleted.`);
    }
    const target = current;

    // Case 1 — leaf node (no children).
    if (target.left === null && target.right === null) {
      this.snapshot(
        `Delete ${value}: case 1 — a LEAF node (no children). Unlink it from ${
          parent === null
            ? "the root: the tree becomes empty"
            : `its parent ${parent.value}`
        }.`,
        { highlight: [value] },
      );
      this.detach(parent, target, null);
      this.snapshot(
        parent === null
          ? `Deleted ${value} — the tree is empty now.`
          : `Deleted ${value} — ${parent.value} lost that leaf.`,
        { found: value },
      );
      return this.finish(value);
    }

    // Case 2 — exactly one child.
    if (target.left === null || target.right === null) {
      const child = target.left ?? target.right;
      if (child === null) {
        // Unreachable: the leaf case above handled "no children at all".
        return this.finish(null, `Value ${value} could not be deleted.`);
      }
      this.snapshot(
        `Delete ${value}: case 2 — exactly ONE child (${child.value}). ${
          parent === null
            ? `The child ${child.value} becomes the new root.`
            : `Link ${parent.value} straight past ${value} to ${child.value}.`
        }`,
        { highlight: [value, child.value] },
      );
      this.detach(parent, target, child);
      this.snapshot(
        `Deleted ${value} — ${child.value} ${
          parent === null ? "is the new root" : `took its place under ${parent.value}`
        }.`,
        { found: value },
      );
      return this.finish(value);
    }

    // Case 3 — two children: replace with the inorder successor.
    this.snapshot(
      `Delete ${value}: case 3 — TWO children. Replace it with its inorder successor: the minimum of the right subtree.`,
      { highlight: [value] },
    );

    let successorParent = target;
    let successor = target.right;
    while (successor.left !== null) {
      this.counters.nodesVisited += 1;
      this.snapshot(
        `Successor hunt: ${successor.value} still has a left child — keep going left.`,
        { highlight: [successor.value] },
      );
      successorParent = successor;
      successor = successor.left;
    }
    this.counters.nodesVisited += 1;
    const successorValue = successor.value;
    const successorRight = successor.right;
    this.snapshot(
      `The successor is ${successorValue} — the leftmost (minimum) node of ${value}'s right subtree.`,
      { highlight: [successorValue] },
    );

    // Unlink the successor node FIRST: it never has a left child, so it is a
    // leaf or has only a right child and its own link simply moves up. After
    // this snapshot the old successor slot no longer holds `successorValue`.
    if (successorParent === target) successorParent.right = successorRight;
    else successorParent.left = successorRight;
    this.snapshot(
      `Unlink the successor node: ${successorParent.value}'s link skips ${
        successorValue
      } and points to ${
        successorRight === null
          ? "null — the slot closes"
          : `${successorRight.value} instead`
      }.`,
      { highlight: [successorParent.value] },
    );

    // Then place the successor's value into the deleted slot — exactly one
    // node holds `successorValue` in the resulting snapshot.
    target.value = successorValue;
    this.snapshot(
      `Copy ${successorValue} into the deleted slot — ${value} is gone and the search order still holds.`,
      { highlight: [successorValue] },
    );
    this.snapshot(
      `Deleted ${value} — its inorder successor ${successorValue} now sits in its place.`,
      { found: successorValue, highlight: [successorValue] },
    );
    return this.finish(value);
  }

  /** In-order traversal: left subtree → node → right subtree (sorted). */
  inorder(): TreeOutcome {
    return this.runTraversal("inorder");
  }

  /** Pre-order traversal: node → left subtree → right subtree. */
  preorder(): TreeOutcome {
    return this.runTraversal("preorder");
  }

  /** Post-order traversal: left subtree → right subtree → node. */
  postorder(): TreeOutcome {
    return this.runTraversal("postorder");
  }

  /** Drops every node and returns how many were removed. */
  clear(): TreeOutcome {
    this.begin();
    const removed = this.countNodes();
    if (removed === 0) {
      this.snapshot("Clear: the tree is already empty.");
      return this.finish(0);
    }

    this.root = null;
    this.snapshot(
      `Cleared ${removed} node${removed === 1 ? "" : "s"} — the tree is empty now.`,
    );
    return this.finish(removed);
  }

  /**
   * Inserts every value in `values`, concatenating each insert's steps into
   * ONE playback stream (used by the UI's "Load sample tree"). Stops at the
   * first refused insert (a duplicate) and reports its error.
   */
  insertAll(values: readonly number[]): TreeOutcome {
    this.begin();
    if (values.length === 0) {
      this.snapshot("Insert all: no values to insert — the tree is unchanged.");
      return this.finish(this.toInorder());
    }

    const steps: TreeStep[] = [];
    const counters: TreeCounters = { nodesVisited: 0, comparisons: 0 };
    let error: string | undefined;

    for (const value of values) {
      const outcome = this.insert(value);
      steps.push(...outcome.steps);
      counters.nodesVisited += outcome.counters.nodesVisited;
      counters.comparisons += outcome.counters.comparisons;
      if (outcome.error !== undefined) {
        error = outcome.error;
        break;
      }
    }

    // `insert` reset the shared buffer on every call; restore the combined
    // stream so a later operation's `begin()` resets this run instead.
    this.steps = steps;
    this.counters = counters;
    return error === undefined
      ? { result: this.toInorder(), steps, counters }
      : { result: null, steps, counters, error };
  }

  // ------------------------------------------------------------ traversal --

  private runTraversal(order: TraversalOrder): TreeOutcome {
    this.begin();
    const { name, rule } = TRAVERSAL_RULES[order];

    if (this.root === null) {
      this.snapshot(`${name}: the tree is empty — nothing to visit.`);
      return this.finish([]);
    }

    const visitOrder: number[] = [];
    this.snapshot(`${name}: ${rule}.`, { visitOrder });
    this.walkFrom(order, this.root, visitOrder);

    const result = [...visitOrder];
    this.snapshot(`${name} complete — ${result.join(", ")}.`, { visitOrder: result });
    return this.finish(result);
  }

  private walkFrom(
    order: TraversalOrder,
    node: TreeNode,
    visitOrder: number[],
  ): void {
    this.counters.nodesVisited += 1;

    if (order === "inorder") {
      if (node.left !== null) {
        this.snapshot(
          `At ${node.value}: in-order descends LEFT first — into ${node.left.value}'s subtree.`,
          { highlight: [node.value], visitOrder },
        );
        this.walkFrom(order, node.left, visitOrder);
      }
      visitOrder.push(node.value);
      this.snapshot(
        `Visit ${node.value} — position ${visitOrder.length} of the in-order sequence.`,
        { highlight: [node.value], visitOrder },
      );
      if (node.right !== null) {
        this.snapshot(
          `At ${node.value}: the left subtree is done — descends RIGHT into ${node.right.value}'s subtree.`,
          { highlight: [node.value], visitOrder },
        );
        this.walkFrom(order, node.right, visitOrder);
      }
      return;
    }

    if (order === "preorder") {
      visitOrder.push(node.value);
      this.snapshot(
        `Visit ${node.value} — pre-order records the node BEFORE its subtrees (position ${visitOrder.length}).`,
        { highlight: [node.value], visitOrder },
      );
      if (node.left !== null) {
        this.snapshot(
          `Descend LEFT from ${node.value} into ${node.left.value}'s subtree.`,
          { highlight: [node.value], visitOrder },
        );
        this.walkFrom(order, node.left, visitOrder);
      }
      if (node.right !== null) {
        this.snapshot(
          `Descend RIGHT from ${node.value} into ${node.right.value}'s subtree.`,
          { highlight: [node.value], visitOrder },
        );
        this.walkFrom(order, node.right, visitOrder);
      }
      return;
    }

    // postorder
    if (node.left !== null) {
      this.snapshot(
        `At ${node.value}: post-order descends LEFT first — into ${node.left.value}'s subtree.`,
        { highlight: [node.value], visitOrder },
      );
      this.walkFrom(order, node.left, visitOrder);
    }
    if (node.right !== null) {
      this.snapshot(
        `At ${node.value}: the left subtree is done — descends RIGHT into ${node.right.value}'s subtree before visiting ${node.value}.`,
        { highlight: [node.value], visitOrder },
      );
      this.walkFrom(order, node.right, visitOrder);
    }
    visitOrder.push(node.value);
    this.snapshot(
      `Visit ${node.value} — both subtrees are complete (position ${visitOrder.length}).`,
      { highlight: [node.value], visitOrder },
    );
  }

  // ------------------------------------------------------------- internals --

  /** One comparison of `value` against a node's value (counted by callers). */
  private compareMessage(value: number, node: TreeNode): string {
    if (value === node.value) {
      return `Compare ${value} with ${node.value}: equal — this is the node.`;
    }
    return `Compare ${value} with ${node.value}: ${value} ${
      value < node.value ? "<" : ">"
    } ${node.value} — go ${value < node.value ? "left" : "right"}.`;
  }

  /** Re-links `parent`'s child from `oldChild` to `replacement` (or root). */
  private detach(
    parent: TreeNode | null,
    oldChild: TreeNode,
    replacement: TreeNode | null,
  ): void {
    if (parent === null) {
      this.root = replacement;
      return;
    }
    if (parent.left === oldChild) parent.left = replacement;
    else parent.right = replacement;
  }

  /** Pure recursive node count (no steps). */
  private countIn(node: TreeNode | null): number {
    if (node === null) return 0;
    return 1 + this.countIn(node.left) + this.countIn(node.right);
  }

  /** Pure recursive height in nodes (no steps); empty tree is 0. */
  private heightIn(node: TreeNode | null): number {
    if (node === null) return 0;
    return 1 + Math.max(this.heightIn(node.left), this.heightIn(node.right));
  }

  /** Deep copy of the live tree into a plain serializable structure. */
  private copyTree(node: TreeNode | null): TreeSnapshot | null {
    if (node === null) return null;
    return {
      value: node.value,
      left: this.copyTree(node.left),
      right: this.copyTree(node.right),
    };
  }

  private begin(): void {
    // New arrays every time: previously returned steps are never touched.
    this.steps = [];
    this.counters = { nodesVisited: 0, comparisons: 0 };
  }

  private snapshot(
    description: string,
    options: {
      highlight?: readonly number[];
      found?: number;
      visitOrder?: readonly number[];
    } = {},
  ): void {
    const step: TreeStep = {
      tree: this.copyTree(this.root),
      highlight: [...(options.highlight ?? [])],
      description,
    };
    if (options.found !== undefined) step.found = options.found;
    if (options.visitOrder !== undefined) step.visitOrder = [...options.visitOrder];
    this.steps.push(step);
  }

  private finish(
    result: TreeOperationResult,
    error?: string,
  ): TreeOutcome {
    return error === undefined
      ? { result, steps: this.steps, counters: this.counters }
      : { result, steps: this.steps, counters: this.counters, error };
  }
}

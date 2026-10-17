import type { TreeSnapshot } from "../trees/types";
import { RecursionRecorder } from "./recorder";
import type { RecursionOutcome } from "./types";

/** Input guard: the tree is capped at 30 nodes or the run is refused. */
export const BST_INORDER_MAX_NODES = 30;

/**
 * In-order traversal of a binary tree, written the recursive way:
 * `walk(left) → visit node → walk(right)`. Over a BST (built with the
 * `VisualBST` engine in `src/algorithms/trees`) the in-order sequence is
 * the values in ascending order.
 *
 * The tree is the SAME plain, serializable `TreeSnapshot` type the Tree
 * Explorer deep-copies into its steps — this function only reads it and
 * never mutates a node. The visit moment of every node is carried by the
 * call step of its RIGHT child, so leaves are described too.
 *
 * Guards (a refusal returns an error and does NOT run): the tree must not
 * be empty, must hold at most BST_INORDER_MAX_NODES nodes and every value
 * must be finite.
 */
export function bstInorder(tree: TreeSnapshot | null): RecursionOutcome {
  const refuse = (error: string): RecursionOutcome => ({
    result: null,
    steps: [],
    counters: { calls: 0, maxDepth: 0 },
    error,
  });

  if (tree === null || tree === undefined) {
    return refuse("In-order traversal refused: the tree is empty — nothing to traverse.");
  }

  const countNodes = (node: TreeSnapshot | null): number =>
    node === null ? 0 : 1 + countNodes(node.left) + countNodes(node.right);

  const count = countNodes(tree);
  if (count > BST_INORDER_MAX_NODES) {
    return refuse(
      `In-order traversal refused: at most ${BST_INORDER_MAX_NODES} nodes are simulated — the tree holds ${count}, so nothing ran.`,
    );
  }

  const checkValues = (node: TreeSnapshot | null): string | null => {
    if (node === null) return null;
    if (!Number.isFinite(node.value)) {
      return `In-order traversal refused: node value ${String(node.value)} is not a finite number.`;
    }
    return checkValues(node.left) ?? checkValues(node.right);
  };
  const valueError = checkValues(tree);
  if (valueError !== null) return refuse(valueError);

  const recorder = new RecursionRecorder();
  const visitOrder: number[] = [];

  /** `entry` carries the parent's context (the visit moment) into the step. */
  const walk = (node: TreeSnapshot | null, entry?: string): void => {
    if (node === null) {
      recorder.enter(
        "inorder",
        "node = null",
        entry === undefined
          ? "Base case: an empty subtree — nothing to walk, so this frame answers immediately."
          : `${entry} Base case: an empty subtree contributes nothing.`,
        true,
      );
      recorder.exit("—", "Return from the empty subtree — nothing was added to the sequence.");
      return;
    }

    const contributedBefore = visitOrder.length;
    recorder.enter(
      "inorder",
      `node = ${node.value}`,
      entry === undefined
        ? `In-order rule at ${node.value}: descend LEFT first — the left subtree finishes before ${node.value} is visited.`
        : `${entry} In-order rule at ${node.value}: descend LEFT first.`,
    );

    walk(node.left, `At ${node.value}: the left subtree comes first.`);

    visitOrder.push(node.value);
    walk(
      node.right,
      `Visited ${node.value} — position ${visitOrder.length} of the sequence — the right subtree comes next.`,
    );

    const contributed = visitOrder.slice(contributedBefore);
    recorder.exit(
      contributed.join(", "),
      `Done with ${node.value} — its subtree contributed ${contributed.length} value${
        contributed.length === 1 ? "" : "s"
      } (${contributed.join(", ")}), and the frame pops.`,
    );
  };

  walk(tree);
  return {
    result: [...visitOrder],
    steps: recorder.toSteps(),
    counters: recorder.snapshotCounters(),
  };
}

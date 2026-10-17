import type { TreeMeta } from "./types";

/**
 * The canonical sample tree used by the UI's "Load sample tree" button and
 * by the tests: a balanced BST of 50 over 30/70 over 20/40/60/80.
 *
 * inorder  20,30,40,50,60,70,80
 * preorder 50,30,20,40,70,60,80
 * postorder 20,40,30,60,80,70,50
 */
export const SAMPLE_TREE: readonly number[] = [50, 30, 70, 20, 40, 60, 80];

/**
 * Registry of the metadata the Tree Explorer page renders. Adding another
 * tree later is two steps: create its engine class next to `bst.ts`, then
 * append its metadata here.
 */
export const trees: TreeMeta = {
  id: "bst",
  name: "Binary Search Tree",
  summary:
    "A hand-rolled BST where every node in the left subtree is smaller and every node in the right subtree is larger. Insert, search and delete walk a single root-to-leaf path — one comparison per node — and duplicates are refused outright.",
  emptyMessage:
    "The tree is empty — insert a value or load the sample tree to grow the root node.",
  duplicatePolicy:
    "Every value is unique: inserting a duplicate is refused and the tree is left unchanged.",
  heightNote:
    "Height counts the nodes on the longest root-to-leaf path (an empty tree is 0).",
  skewNote:
    "Worst case: inserting sorted values (1, 2, 3, …) degenerates the BST into a linked list — h = n, so search, insert and delete all drop to O(n). Self-balancing trees (AVL, red-black) keep h ≈ log n.",
  complexity: [
    { term: "Search", value: "O(log n) avg · O(n) worst" },
    { term: "Insert", value: "O(log n) avg · O(n) worst" },
    { term: "Delete", value: "O(log n) avg · O(n) worst" },
    { term: "Traversal", value: "O(n)" },
    { term: "Height / node count", value: "O(n)" },
    { term: "Space", value: "O(h) recursive" },
  ],
};

export function getTreeMeta(): TreeMeta {
  return trees;
}

export { VisualBST } from "./bst";
export type {
  TreeCounters,
  TreeMeta,
  TreeOperationResult,
  TreeOutcome,
  TreeSnapshot,
  TreeStep,
  TraversalOrder,
} from "./types";

/**
 * Shared types for the Tree Explorer engine in `src/algorithms/trees`.
 *
 * COUNTER DEFINITIONS (used by every operation in this folder):
 * - `nodesVisited` — incremented on EVERY node the operation had to look at
 *   (the node being compared, examined, counted or about to be deleted).
 * - `comparisons` — incremented on EVERY value-to-node-value comparison
 *   (e.g. `40 < 50` during insert/search/delete). Structural walks that only
 *   test links (the inorder-successor hunt) count visits, not comparisons.
 *
 * CONTRACT FOR ALL OPERATIONS IN THIS FOLDER:
 * - Pure TypeScript: no React, no DOM, no built-in collections for the
 *   demonstrated operations — the tree itself is a hand-rolled `TreeNode`
 *   graph inside a hand-rolled `BST` class.
 * - Every operation returns `{ result, steps, counters, error? }`.
 * - Invalid operations (duplicate insert, missing value, empty-tree
 *   search/delete, non-finite input) return an `error` string and NEVER
 *   throw. Duplicate policy: this tree REJECTS duplicates — inserting a
 *   value that already exists returns an error and leaves the tree
 *   completely unchanged.
 * - Steps are immutable snapshots: `tree` is a plain serializable
 *   `{ value, left, right }` structure DEEP-COPIED on every step, and
 *   `highlight` / `visitOrder` get fresh arrays — so an earlier snapshot can
 *   never be rewritten by a later step or a later operation.
 * - The LAST step of an outcome always shows the real tree state after the
 *   operation (for errors too, i.e. the unchanged tree).
 *
 * STEP SEMANTICS (the UI relies on these conventions):
 * - `tree` is the full tree after everything described by this step happened.
 * - `highlight` lists node VALUES painted in the accent tone — the node being
 *   compared or visited on this step. Values are unique (no duplicates), so a
 *   value identifies exactly one node.
 * - `found` marks the node the operation located (the search hit, the node a
 *   delete removed); the UI paints it dim green.
 * - `visitOrder` is the cumulative traversal sequence, growing one value at a
 *   time; it is set on every step of an inorder/preorder/postorder run and
 *   omitted by insert/search/delete.
 */

/** Plain, serializable tree node — deep-copied into every step. */
export type TreeSnapshot = {
  value: number;
  left: TreeSnapshot | null;
  right: TreeSnapshot | null;
};

/** One immutable frame of a tree operation. */
export type TreeStep = {
  tree: TreeSnapshot | null;
  /** Node VALUES highlighted on this step (accent tone in the UI). */
  highlight: number[];
  /** Set when the operation located its target (found/deleted node). */
  found?: number;
  /** Cumulative visit sequence — present on traversal steps only. */
  visitOrder?: number[];
  description: string;
};

/** See the counter definitions at the top of this file. */
export type TreeCounters = {
  nodesVisited: number;
  comparisons: number;
};

/**
 * What an operation produced: an inserted/deleted value, a hit/miss answer,
 * an array of values (traversals), a height or a count — or `null` when the
 * operation was refused and did not mutate the tree.
 */
export type TreeOperationResult = number | number[] | boolean | null;

export type TreeOutcome = {
  result: TreeOperationResult;
  steps: TreeStep[];
  counters: TreeCounters;
  /** Present ONLY when the operation was invalid and did not run to the end. */
  error?: string;
};

export type TraversalOrder = "inorder" | "preorder" | "postorder";

/** Metadata the explorer page reads to render its notes and cards. */
export type TreeMeta = {
  id: "bst";
  name: string;
  summary: string;
  /** Designed empty state shown by the visualizer when there is no tree. */
  emptyMessage: string;
  /** The duplicate policy, shown verbatim in the UI. */
  duplicatePolicy: string;
  /** How `height` is defined, shown next to the stat. */
  heightNote: string;
  /** The skewed-tree worst-case note shown under the complexity card. */
  skewNote: string;
  complexity: ReadonlyArray<{ term: string; value: string }>;
};

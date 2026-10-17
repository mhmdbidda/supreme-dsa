/**
 * Shared types for every data structure in `src/algorithms/data-structures`.
 *
 * COUNTER DEFINITIONS (used by every structure in this folder):
 * - `nodesVisited` — incremented on EVERY node the operation had to walk over
 *   (peeking at the top/front node counts as one visit).
 * - `pointerChanges` — incremented on EVERY reference rewrite: a `top`,
 *   `front`, `rear`, `head` or `tail` pointer move, or a `next` re-link
 *   inside a linked list.
 *
 * CONTRACT FOR ALL STRUCTURES IN THIS FOLDER:
 * - Classes built BY HAND on their own node types — never wrapping a
 *   built-in array or a library collection for the demonstrated operations.
 * - Every operation returns `{ result, steps, counters, error? }`.
 * - Invalid operations (pop/dequeue on empty, bad position, ...) return an
 *   `error` string and NEVER throw.
 * - Steps are immutable snapshots: every push creates fresh `items` and
 *   `highlight` arrays, so an earlier snapshot can never be rewritten by a
 *   later step or a later operation.
 * - The LAST step of an outcome always shows the structure's real state
 *   after the operation (`items` equals `toArray()`), for errors too.
 *
 * STEP SEMANTICS (the UI relies on these conventions):
 * - `items` is the structure read in a canonical order:
 *   head → tail for the queue and the linked list, bottom → top for the
 *   stack. So `items[items.length - 1]` is the stack top / queue rear.
 * - `highlight` lists the indices (positions in `items`) painted in the
 *   accent tone — the node an operation is working on.
 * - `pointers` names the structural pointers and where they point; index
 *   values refer to positions in `items` of the SAME snapshot. During a
 *   linked-list reversal, `current` marks the node being re-linked while
 *   `items` keeps the original head-to-tail order (the chain is briefly
 *   split in two, so a single canonical read does not exist yet).
 */

export type DSStructureId = "stack" | "queue" | "linked-list";

/** Named pointer positions inside a snapshot; values index into `items`. */
export type DSPointers = {
  head?: number;
  tail?: number;
  top?: number;
  front?: number;
  rear?: number;
  current?: number;
};

/** One immutable frame of a structure operation. */
export type DSSnapshot = {
  items: number[];
  highlight: number[];
  pointers: DSPointers;
  description: string;
};

/** See the counter definitions at the top of this file. */
export type DSCounters = {
  nodesVisited: number;
  pointerChanges: number;
};

/**
 * The value an operation produced: a popped/enqueued value, a found index,
 * a boolean answer, an array of values (traverse/reverse), or `null` when
 * the operation refused to do anything.
 */
export type DSOperationResult = number | boolean | number[] | null;

export type DSOutcome = {
  result: DSOperationResult;
  steps: DSSnapshot[];
  counters: DSCounters;
  /** Present ONLY when the operation was invalid and did not mutate. */
  error?: string;
};

export type DSStructureMeta = {
  id: DSStructureId;
  name: string;
  summary: string;
  /** Designed empty state shown by the visualizer when there is nothing to draw. */
  emptyMessage: string;
  complexity: ReadonlyArray<{ term: string; value: string }>;
};

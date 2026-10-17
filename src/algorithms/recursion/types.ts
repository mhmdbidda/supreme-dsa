/**
 * Shared types for the Recursion Visualizer in `src/algorithms/recursion`.
 *
 * CONTRACT FOR ALL FUNCTIONS IN THIS FOLDER (same rules as the rest of the
 * app's algorithm folders):
 * - Pure TypeScript: no React, no DOM, no globals, no I/O.
 * - Inputs are NEVER mutated; the array/tree arguments are only read.
 * - Every function returns `{ result, steps, counters, error? }` and NEVER
 *   throws — invalid input (out-of-range n, oversized array, unsorted
 *   input, empty tree, non-finite values) returns an `error` string with
 *   EMPTY `steps` and zeroed counters: the recursion never runs.
 * - Steps are immutable snapshots: `stack` is a freshly deep-copied array
 *   of freshly copied `{ fn, params }` frames on EVERY step, so one step
 *   can never be rewritten by a later step.
 *
 * STEP SEMANTICS (the UI relies on these conventions):
 * - `event: "call"` — a frame was pushed. `depth` is the stack height AFTER
 *   the push (so depth is 1 for the outermost call) and `stack` includes
 *   the new frame, whose entry is the TOP frame (`stack[stack.length - 1]`).
 * - `event: "return"` — a frame was popped. `depth` is the height the stack
 *   had BEFORE the pop (the depth of the frame that is leaving), `stack`
 *   shows the frames that REMAIN after the pop, and `returnValue` records
 *   what the popped frame handed back to its caller. The final step of
 *   every successful run therefore has an EMPTY `stack` — the recursion
 *   has fully unwound.
 * - `isBaseCase` is set on the `call` step of a frame that returns without
 *   recursing (an empty window, `n = 0`, a `null` child, …). Params fully
 *   determine whether a call is a base case, so the UI can label stacked
 *   frames too.
 * - `params` is a short human-readable rendering of the frame's arguments
 *   (e.g. `n = 5` or `lo = 0, hi = 4`) — it is the identity of a frame.
 */
export type RecursionFrame = {
  fn: string;
  params: string;
};

/** One immutable frame of a recursive run: a push or a pop. */
export type RecursionStep = {
  event: "call" | "return";
  fn: string;
  params: string;
  depth: number;
  /** What the popped frame returned — present on `return` steps only. */
  returnValue?: number | string;
  /** Deep copy of the call stack AT this step (post-pop on returns). */
  stack: RecursionFrame[];
  isBaseCase?: boolean;
  description: string;
};

/** See the counter definitions below. */
export type RecursionCounters = {
  /** Total `call` events — one per frame entered, base cases included. */
  calls: number;
  /** Deepest stack height reached (the peak of the frame tower). */
  maxDepth: number;
};

/**
 * What a function produced: a number (factorial, fibonacci, the found
 * index of a binary search) or an array of values (an inorder traversal) —
 * or `null` when the run was refused and nothing executed.
 */
export type RecursionResult = number | number[] | null;

export type RecursionOutcome = {
  result: RecursionResult;
  steps: RecursionStep[];
  counters: RecursionCounters;
  /** Present ONLY when the input was refused and the recursion never ran. */
  error?: string;
};

/**
 * Extending the lab = add a new id here, a new file in this folder, and one
 * entry in `index.ts`. The UI reads the registry, so no page changes needed.
 */
export type RecursionFunctionId =
  | "factorial"
  | "fibonacci"
  | "binarySearch"
  | "bstInorder";

export type RecursionComplexity = {
  time: string;
  space: string;
};

/** Metadata the visualizer reads to render its notes, hints and cards. */
export type RecursionMeta = {
  id: RecursionFunctionId;
  name: string;
  summary: string;
  /** Name of the input field rendered for this function. */
  inputLabel: string;
  /** Placeholder shown in the input field. */
  inputPlaceholder: string;
  /** One-line explanation of what the input means. */
  inputHint: string;
  /** Guard note, shown verbatim next to the input (the hard limits). */
  limitNote: string;
  complexity: RecursionComplexity;
};

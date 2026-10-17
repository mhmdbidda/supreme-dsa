import { FIBONACCI_MAX, FIBONACCI_MIN } from "./fibonacci";
import { FACTORIAL_MAX, FACTORIAL_MIN } from "./factorial";
import { BST_INORDER_MAX_NODES } from "./bstInorder";
import { RECURSIVE_SEARCH_MAX_LENGTH } from "./recursiveBinarySearch";
import type {
  RecursionFunctionId,
  RecursionMeta,
} from "./types";

/**
 * Registry of the recursive functions exposed by the visualizer.
 *
 * Adding a function later is three steps:
 * 1. create `src/algorithms/recursion/<name>.ts` exporting a pure
 *    `(…args) => RecursionOutcome` that never throws,
 * 2. add its id to `RecursionFunctionId` in `types.ts`,
 * 3. append its metadata entry below — the UI picks it up automatically.
 */
export const recursionFunctions: RecursionMeta[] = [
  {
    id: "factorial",
    name: "Factorial",
    summary:
      "The canonical linear recursion: n! = n × (n − 1)!, with 0! = 1 as the base case. One call per value of n, and every multiplication happens on the way back up.",
    inputLabel: "n",
    inputPlaceholder: "5",
    inputHint: "The single integer argument of factorial(n).",
    limitNote: `Integer ${FACTORIAL_MIN}..${FACTORIAL_MAX}.`,
    complexity: { time: "O(n)", space: "O(n) call stack" },
  },
  {
    id: "fibonacci",
    name: "Fibonacci (naive)",
    summary:
      "fib(n) = fib(n − 1) + fib(n − 2) with no memoization — the call tree duplicates entire subtrees, which makes it the clearest way to see why naive recursion explodes exponentially.",
    inputLabel: "n",
    inputPlaceholder: "5",
    inputHint: "The single integer argument of fibonacci(n).",
    limitNote: `Integer ${FIBONACCI_MIN}..${FIBONACCI_MAX} — fib(10) already expands to 177 calls.`,
    complexity: { time: "O(2ⁿ)", space: "O(n) call stack" },
  },
  {
    id: "binarySearch",
    name: "Binary Search (recursive)",
    summary:
      "Recursive binary search: probe the middle of the window, then recurse into the half that can still hold the target. Each frame returns the index it found, unchanged, all the way up.",
    inputLabel: "Sorted array and target",
    inputPlaceholder: "1, 3, 5, 7, 9",
    inputHint: "Comma-separated sorted numbers, plus the value to search for.",
    limitNote: `At most ${RECURSIVE_SEARCH_MAX_LENGTH} elements; unsorted input is refused.`,
    complexity: { time: "O(log n)", space: "O(log n) call stack" },
  },
  {
    id: "bstInorder",
    name: "BST In-order Traversal",
    summary:
      "Recursive in-order traversal (left subtree → node → right subtree) over the Tree Explorer's own BST snapshot. Over a search tree the visit order comes out ascending.",
    inputLabel: "Tree values",
    inputPlaceholder: "50, 30, 70, 20, 40, 60, 80",
    inputHint: "Comma-separated values inserted into a BST, in insertion order.",
    limitNote: `At most ${BST_INORDER_MAX_NODES} nodes; duplicates are refused by the BST.`,
    complexity: { time: "O(n)", space: "O(h) call stack" },
  },
];

export function getRecursionFunction(id: RecursionFunctionId): RecursionMeta {
  return (
    recursionFunctions.find((entry) => entry.id === id) ?? recursionFunctions[0]
  );
}

export { factorial, FACTORIAL_MAX, FACTORIAL_MIN } from "./factorial";
export { fibonacci, FIBONACCI_MAX, FIBONACCI_MIN } from "./fibonacci";
export {
  recursiveBinarySearch,
  RECURSIVE_SEARCH_MAX_LENGTH,
} from "./recursiveBinarySearch";
export { bstInorder, BST_INORDER_MAX_NODES } from "./bstInorder";
export {
  buildCallTree,
  countCallsByParams,
  summarizeRecursionProgress,
  type CallTreeNode,
} from "./callTree";
export type {
  RecursionComplexity,
  RecursionCounters,
  RecursionFrame,
  RecursionFunctionId,
  RecursionMeta,
  RecursionOutcome,
  RecursionResult,
  RecursionStep,
} from "./types";

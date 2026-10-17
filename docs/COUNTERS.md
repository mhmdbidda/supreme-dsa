# Counters — exact definitions per algorithm

Every algorithm in this project reports a small set of counters alongside its step stream.
This document is the **exact, per-operation definition** of each counter, so that two
numbers shown next to each other mean the same thing. The source of truth in code is the
comment block at the top of each `src/algorithms/*/types.ts`; this file expands on it.

Two rules apply throughout:

- **Counters are deterministic.** For a given input, a comparison count is always the same
  on every machine and every run. Timings are not.
- **Timings do not prove Big-O.** Big-O describes how work *grows*; a measured runtime is
  noisy and depends on hardware, browser load, input distribution and implementation. The
  benchmark's comparison column is exact; its millisecond column is evidence at best.

---

## Sorting — `src/algorithms/sorting`

Two counters: `comparisons` and `swaps`.

- **`comparisons`** is incremented on **every element-to-element comparison**, even when
  the comparison does not lead to a swap or a write.
- **`swaps`** is overloaded by algorithm on purpose. For Bubble Sort it counts **exchanges**
  of two out-of-order neighbours; for Merge Sort it counts **writes** of a value back into
  the array. The labels in the UI follow suit ("Swaps / moves"), and the raw field name is
  `swaps` for both. Do **not** compare merge's move count 1:1 with bubble's swap count.

### Bubble Sort (early exit) — `bubbleSort.ts`

- `comparisons`: +1 for every adjacent pair test `array[j] > array[j + 1]`. The test is
  counted whether or not it swaps.
- `swaps`: +1 for every swap of two out-of-order neighbours.
- **Early exit:** if a full pass performs no swaps, the array is already sorted; the
  remaining passes are skipped and the step stream ends early.
- Consequences: an already-sorted array of *n* items costs `n − 1` comparisons and `0`
  swaps; a reverse-sorted array is the worst case (`n(n − 1)/2` comparisons and swaps).

### Merge Sort (top-down, stable) — `mergeSort.ts`

- `comparisons`: +1 for every `aux[i] <= aux[j]` test between the heads of the two halves
  being merged.
- `swaps` (reported as **moves/writes**): +1 for **every write** of a value back into the
  main array, **including the tail copies that follow no comparison** (when one half is
  exhausted and the rest of the other is copied over).
- Because of the tail copies, merge's write count is larger than its comparison count for
  many inputs; that is expected and is why the two columns are labelled separately.
- Merge Sort is stable: equal elements keep their original relative order (the test uses
  `<=`, taking from the left half first).

---

## Searching — `src/algorithms/searching`

One counter: `comparisons`.

- **`comparisons`**: +1 for **every element-to-element comparison between a stored value
  and the search target**.

### Linear Search — `linearSearch.ts`

- +1 for every index compared against the target, scanning left to right, stopping at the
  first match.
- Target present at index *i* (0-based): `i + 1` comparisons. Target absent: `n`
  comparisons.

### Binary Search (iterative) — `binarySearch.ts`

- +1 for **every mid probe** (`array[mid]` compared with the target).
- Example: probing the last item of a 5-element array takes 3 probes.
- **The sortedness precondition scan is NOT counted.** The single O(n) validation pass that
  checks the array is ascending is a validation pass, not a search step.
- **Unsorted input is refused.** Nothing is probed, no comparison is counted, the counters
  stay at 0, and `refusedUnsortedInput: true` is returned so the UI can offer to sort a
  copy first. The counters from that pre-sort are reported in a separate "reported
  separately" panel and never folded into the search counters.

---

## Data Structures — `src/algorithms/data-structures`

Two counters: `nodesVisited` and `pointerChanges`.

- **`nodesVisited`**: +1 for **every node the operation had to walk over**. Peeking at the
  top of a stack / front of a queue counts as one visit.
- **`pointerChanges`**: +1 for **every reference rewrite** — a `top`, `front`, `rear`,
  `head` or `tail` pointer move, or a `next` re-link inside a linked list.

### Stack (linked nodes) — `stack.ts`

| Operation | `nodesVisited` | `pointerChanges` |
| --- | --- | --- |
| `push` | 0 | 1 (the `top` pointer) |
| `pop` (non-empty) | 0 | 1 (the `top` pointer) |
| `peek` (non-empty) | 1 (the top node) | 0 |
| `isEmpty` / `size` | 0 | 0 |
| `clear` (non-empty) | 0 | 1 (drops `top`) |

Refused operations (pop / peek on empty) return an error and count nothing.

### Queue (linked nodes, two pointers) — `queue.ts`

| Operation | `nodesVisited` | `pointerChanges` |
| --- | --- | --- |
| `enqueue` | 0 | 2 (front + rear when empty, else rear link + rear pointer) |
| `dequeue` (non-empty) | 0 | 1 (front pointer), +1 more when it empties the queue → 2 |
| `front` (non-empty) | 1 (the front node) | 0 |
| `isEmpty` / `size` | 0 | 0 |
| `clear` (non-empty) | 0 | 2 (front + rear) |

`enqueue` counts 2 pointer changes whether the queue was empty or not: either both
`front` and `rear` are set, or the old rear's `next` link and the `rear` pointer are
rewritten. Refused operations (dequeue / front on empty) count nothing.

### Singly Linked List — `linkedList.ts`

`nodesVisited` counts every node examined while walking. `pointerChanges` counts every
link/pointer rewrite.

| Operation | `nodesVisited` | `pointerChanges` |
| --- | --- | --- |
| `insertHead` | 0 | 1 (`head`); +1 more when the list was empty (also sets `tail`) |
| `insertTail` | 0 | 2 (head + tail when empty, else tail link + tail pointer) |
| `insertAt(0, v)` | 0 | same as `insertHead` |
| `insertAt(size, v)` | 0 | same as `insertTail` |
| `insertAt(k, v)`, 0 < k < size | 1 per node walked to reach `k − 1`, +1 for the target node | 1 (the predecessor's `next`) |
| `deleteAt(k)` | 1 per node walked to reach `k` | 1 (the unlink: `head` or predecessor `next`); +1 more when it also moves `tail` or clears an empty `head` |
| `deleteValue(v)` | 1 per node scanned, +1 for the match (or 0 visits on a miss is not possible — the scan counts each non-match) | same unlink rules as `deleteAt` |
| `search(v)` | 1 per node examined (including the match) | 0 |
| `traverse` | 1 per node | 0 |
| `reverse` | 1 per node (the walk) | 1 per node (its `next` re-link) **+2** for the final `head`/`tail` swap |
| `size` / `isEmpty` | 0 | 0 |
| `clear` (non-empty) | 0 | 2 (`head` + `tail`) |

Refused operations (bad position, deleting a value that is absent) return an error and
leave the list unchanged; the counters still reflect the walk that discovered the failure.

---

## Trees — `src/algorithms/trees`

Two counters: `nodesVisited` and `comparisons`.

- **`nodesVisited`**: +1 for **every node the operation had to look at** — the node being
  compared, examined, counted, or about to be deleted.
- **`comparisons`**: +1 for **every value-to-node-value comparison** (e.g. `40 < 50` during
  insert / search / delete).

Per operation:

- **`insert`, `search`, `delete`**: count both a visit and a comparison at each node on the
  root-to-target path.
- **`inorder`, `preorder`, `postorder`**: count **visits only** — a traversal walks links,
  it does not compare values, so `comparisons` stays 0.
- **`height`**: one visit per node on the explored paths, no comparisons.
- **`nodeCount`**: one visit per node, no comparisons.
- **`insertAll` (sample / bulk load)**: the counters are the **sum of each individual
  insert's counters**, so a bulk load reports the same totals as doing the inserts one at a
  time.
- **Duplicate policy:** this BST **rejects duplicates**. A duplicate insert is refused and
  leaves the tree completely unchanged; its counters reflect the walk up to the moment the
  duplicate was detected. `clear` resets the tree and reports 0 counters.

---

## Graphs — `src/algorithms/graphs`

Two counters, shared by BFS and DFS:

- **`verticesVisited`**: the number of **distinct vertices the traversal reached**. The
  start vertex counts as reached the moment it is discovered. It is reported as
  `visited.size` (not a per-step increment), so it counts each vertex once.
- **`edgesExamined`**: +1 for **every adjacency-list entry looked at** while walking a
  vertex's neighbour list. With an adjacency list this is proportional to `2·E` for an
  undirected graph (each edge is seen from both endpoints at most once).

Notes:

- Both BFS and DFS run in O(V + E); `verticesVisited` and `edgesExamined` are the measured
  V and E terms.
- Traversals never mutate the graph they read.
- BFS returns edge-count distances on its final step; that is a result, not a counter.

---

## Recursion — `src/algorithms/recursion`

Two counters: `calls` and `maxDepth`.

- **`calls`**: +1 for **every `call` event** — one per frame entered, **base cases
  included**.
- **`maxDepth`**: the **deepest stack height reached** (the peak of the frame tower);
  `depth` is 1 for the outermost call.

Per function:

- **Factorial `factorial(n)`**: `n + 1` calls for valid `n ≥ 0` (the base case at `n = 0`
  is a call). `maxDepth = n + 1`.
- **Fibonacci `fibonacci(n)`** (naive): the call count grows exponentially — this is the
  point of the visualization. The call tree panel badges repeated subproblems (the same
  frame params entered more than once).
- **Recursive binary search `recursiveBinarySearch(values, target)`**: one call per probed
  window; a window that becomes empty is a base case.
- **BST inorder `bstInorder(tree)`**: one call per node visited (plus base cases for null
  children), reusing the Tree Explorer's engine to build the snapshot.

A refused run (out-of-range `n`, oversized array, unsorted input, empty tree, non-finite
values) returns an error with **empty steps and zeroed counters** — the recursion never ran.

---

## How the UI derives live counters

The step stream does not carry running totals. `src/lib/progress.ts` reconstructs them from
the conventions encoded in each step:

- Sorting: a step with `comparedIndices` is a comparison; a step with `swapped: true` is a
  swap (Bubble) or a write (Merge). The scan stops at the current playback index, so the
  numbers grow as the steps play back and reach exactly the engine's final counters.
- Searching: a step with `comparedIndices` is a probe; search never writes.

Because both the live counters and the final counters come from the same recorded steps,
the number shown while scrubbing can never disagree with the number reported at the end.

---

## Benchmark comparison column

`/complexity` reports, per algorithm and input size:

- **Median ms** — the median of the configured trials, measured with `performance.now()`
  around the algorithm in **fast mode only** (no step generation inside the timed section).
  Every algorithm receives a fresh copy of the **same seeded input**, so differences are
  algorithmic, not input noise.
- **Comparisons** and **Swaps / moves** — the deterministic counters defined above.

The ms column is a measurement: treat it as evidence, never as proof of a complexity class.
The comparisons column is exact for the given input.

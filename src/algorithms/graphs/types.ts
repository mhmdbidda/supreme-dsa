/**
 * Shared types for the Graph Studio engine in `src/algorithms/graphs`.
 *
 * COUNTER DEFINITIONS (used by every traversal in this folder):
 * - `verticesVisited` — how many distinct vertices the traversal reached
 *   (the start vertex counts as reached the moment it is discovered).
 * - `edgesExamined` — incremented once for every adjacency entry the
 *   traversal looked at while walking a vertex's neighbour list.
 *
 * CONTRACT FOR EVERYTHING IN THIS FOLDER:
 * - Pure TypeScript: no React, no DOM, no graph library — the structure is a
 *   hand-rolled adjacency list (`Map<number, GraphEdge[]>`) inside `Graph`.
 * - Every mutating operation returns `{ ok, error? }` and NEVER throws. An
 *   invalid operation (duplicate vertex, edge to a missing vertex, self-loop,
 *   duplicate edge, removing what is not there) returns `error` and leaves
 *   the graph unchanged.
 * - `bfs` / `dfs` return `{ result, steps, counters, error? }`. An invalid or
 *   missing start vertex returns `error` with an empty order.
 * - Steps are immutable snapshots: `visited`, `frontier`, `order` (and
 *   `distances`) are DEEP-COPIED on every step, so a later step — or a later
 *   traversal — can never rewrite an earlier snapshot. Traversals never
 *   mutate the graph they read.
 */

/** One neighbour entry in the adjacency list: where it goes and its weight. */
export type GraphEdge = {
  to: number;
  weight: number;
};

/** Result of a graph mutation; `error` is present only when it was refused. */
export type GraphEditOutcome = {
  ok: boolean;
  error?: string;
};

/** One row of the derived adjacency-list view (neighbours sorted ascending). */
export type AdjacencyListEntry = {
  vertex: number;
  neighbors: GraphEdge[];
};

/** The derived adjacency-matrix view; `matrix[i][j]` is 0/1 or the weight. */
export type AdjacencyMatrix = {
  vertices: number[];
  matrix: number[][];
};

/** One immutable frame of a traversal. */
export type GraphStep = {
  /** Every vertex discovered so far (includes the current one and frontier). */
  visited: number[];
  /** BFS queue contents or DFS stack contents, in order. */
  frontier: number[];
  /** The vertex being processed on this step (accent tone in the UI). */
  current?: number;
  /** Cumulative visit order, growing one vertex at a time. */
  order: number[];
  description: string;
  /** Set on the final BFS step only: edge-count distance per visited vertex. */
  distances?: Record<number, number>;
};

/** See the counter definitions at the top of this file. */
export type GraphCounters = {
  verticesVisited: number;
  edgesExamined: number;
};

/** What a traversal produced: the visit order, plus BFS distances. */
export type GraphTraversalResult = {
  order: number[];
  /** BFS only: shortest-path edge count from the start to each visited vertex. */
  distances?: Record<number, number>;
};

export type GraphTraversalOutcome = {
  result: GraphTraversalResult;
  steps: GraphStep[];
  counters: GraphCounters;
  /** Present ONLY when the traversal was refused (missing/invalid start). */
  error?: string;
};

export type GraphAlgorithm = "bfs" | "dfs";

/** The sample graph the UI's "Load sample graph" button and tests share. */
export type SampleGraph = {
  directed: boolean;
  weighted: boolean;
  vertices: number[];
  edges: Array<{ from: number; to: number; weight?: number }>;
};

/** Metadata the Graph Studio page reads to render its notes and cards. */
export type GraphMeta = {
  id: "graph";
  name: string;
  summary: string;
  /** Designed empty state shown by the canvas when there are no vertices. */
  emptyMessage: string;
  /** Adjacency-list trade-off, shown verbatim in the side panel. */
  listNote: string;
  /** Adjacency-matrix trade-off, shown verbatim in the side panel. */
  matrixNote: string;
  complexity: ReadonlyArray<{ term: string; value: string }>;
};

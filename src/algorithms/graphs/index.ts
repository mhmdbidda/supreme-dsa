import type { GraphMeta, SampleGraph } from "./types";

/**
 * The canonical sample graph used by the UI's "Load sample graph" button and
 * by the tests: 7 vertices, a triangle cycle (0–1–2–0) with two more vertices
 * hanging off it (0–3–4), and one SEPARATE component (5—6). Loaded as an
 * undirected, weighted graph.
 */
export const SAMPLE_GRAPH: SampleGraph = {
  directed: false,
  weighted: true,
  vertices: [0, 1, 2, 3, 4, 5, 6],
  edges: [
    { from: 0, to: 1, weight: 4 },
    { from: 1, to: 2, weight: 2 },
    { from: 2, to: 0, weight: 5 },
    { from: 0, to: 3, weight: 7 },
    { from: 3, to: 4, weight: 3 },
    { from: 5, to: 6, weight: 6 },
  ],
};

/**
 * Metadata the Graph Studio page renders. Adding another traversal later is
 * two steps: implement it next to `bfs`/`dfs`, then register it here.
 */
export const graphs: GraphMeta = {
  id: "graph",
  name: "Graph Studio",
  summary:
    "A hand-rolled graph on its own adjacency list. Draw vertices and edges, then run BFS or DFS and watch the frontier, the visited set and the visit order evolve one step at a time.",
  emptyMessage:
    "The graph is empty — click anywhere on the canvas to place the first vertex, add vertices by id, or load the sample graph.",
  listNote:
    "Adjacency list — O(V + E) space, and a vertex's neighbours cost O(deg) to walk. The right default for sparse graphs.",
  matrixNote:
    "Adjacency matrix — O(V²) space but O(1) edge lookup, so it wins on dense graphs and frequent \"is there an edge?\" tests.",
  complexity: [
    { term: "BFS time", value: "O(V + E)" },
    { term: "DFS time", value: "O(V + E)" },
    { term: "BFS space", value: "O(V) queue" },
    { term: "DFS space", value: "O(V) stack" },
    { term: "Adjacency list", value: "O(V + E) space" },
    { term: "Adjacency matrix", value: "O(V²) space" },
  ],
};

export function getGraphMeta(): GraphMeta {
  return graphs;
}

export { Graph, type GraphOptions } from "./graph";
export { bfs, dfs } from "./traversal";
export type {
  AdjacencyListEntry,
  AdjacencyMatrix,
  GraphAlgorithm,
  GraphCounters,
  GraphEdge,
  GraphEditOutcome,
  GraphMeta,
  GraphStep,
  GraphTraversalOutcome,
  GraphTraversalResult,
  SampleGraph,
} from "./types";

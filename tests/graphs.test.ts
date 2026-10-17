import { describe, expect, it } from "vitest";
import { Graph, MAX_GRAPH_VERTICES } from "../src/algorithms/graphs/graph";
import { bfs, dfs } from "../src/algorithms/graphs/traversal";
import { SAMPLE_GRAPH } from "../src/algorithms/graphs";
import {
  expectConsistentGraphOutcome,
  expectNoGraphMutation,
  graphFingerprint,
} from "./helpers/graph";

/** A small tree-shaped known graph: 0 over 1/2 over 3/4 over 5. */
const KNOWN_EDGES: ReadonlyArray<[number, number]> = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [3, 5],
];

const KNOWN_VERTICES = [0, 1, 2, 3, 4, 5];

function buildKnown(options: { directed?: boolean; weighted?: boolean } = {}): Graph {
  const graph = new Graph(options);
  for (const id of KNOWN_VERTICES) {
    expect(graph.addVertex(id).ok).toBe(true);
  }
  for (const [from, to] of KNOWN_EDGES) {
    expect(graph.addEdge(from, to).ok).toBe(true);
  }
  return graph;
}

describe("Graph · editing", () => {
  it("adds vertices and reports duplicates without throwing", () => {
    const graph = new Graph();
    expect(graph.addVertex(0).ok).toBe(true);
    expect(graph.addVertex(0)).toMatchObject({ ok: false });
    expect(graph.addVertex(0).error).toMatch(/already exists/i);
    expect(graph.addVertex(2).ok).toBe(true);
    expect(graph.vertices()).toEqual([0, 2]);
    expect(graph.vertexCount()).toBe(2);
  });

  it("removes a vertex together with every incident edge", () => {
    const graph = buildKnown();
    expect(graph.edgeCount()).toBe(5);

    const outcome = graph.removeVertex(1);
    expect(outcome.ok).toBe(true);
    expect(graph.vertices()).toEqual([0, 2, 3, 4, 5]);
    expect(graph.edgeList()).toEqual([
      { from: 0, to: 2, weight: 1 },
      { from: 2, to: 4, weight: 1 },
      { from: 3, to: 5, weight: 1 },
    ]);
    expect(graph.neighbors(0)).toEqual([{ to: 2, weight: 1 }]);

    expect(graph.removeVertex(1)).toMatchObject({ ok: false });
  });

  it("removes incoming edges too when a directed vertex is deleted", () => {
    const graph = new Graph({ directed: true });
    graph.addVertex(0);
    graph.addVertex(1);
    graph.addEdge(0, 1);

    expect(graph.removeVertex(1).ok).toBe(true);
    expect(graph.vertices()).toEqual([0]);
    expect(graph.edgeCount()).toBe(0);
  });

  it("adds and removes edges, refusing unknown ones", () => {
    const graph = new Graph();
    graph.addVertex(0);
    graph.addVertex(1);

    expect(graph.addEdge(0, 1, 7).ok).toBe(true);
    expect(graph.hasEdge(0, 1)).toBe(true);
    expect(graph.edgeCount()).toBe(1);

    expect(graph.removeEdge(0, 1).ok).toBe(true);
    expect(graph.hasEdge(0, 1)).toBe(false);
    expect(graph.removeEdge(0, 1)).toMatchObject({ ok: false });
    expect(graph.removeEdge(4, 5)).toMatchObject({ ok: false });
  });

  it("refuses self-loops and edges to a missing vertex", () => {
    const graph = new Graph();
    graph.addVertex(0);
    graph.addVertex(1);

    expect(graph.addEdge(0, 0).error).toMatch(/self-loop/i);
    expect(graph.addEdge(0, 9).error).toMatch(/does not exist/i);
    expect(graph.addEdge(9, 0).error).toMatch(/does not exist/i);
    expect(graph.edgeCount()).toBe(0);
  });

  it("refuses a duplicate edge and a non-finite weight", () => {
    const graph = new Graph();
    graph.addVertex(0);
    graph.addVertex(1);
    graph.addEdge(0, 1);

    expect(graph.addEdge(0, 1).error).toMatch(/already exists/i);
    expect(graph.addEdge(0, 1, Number.NaN).error).toMatch(/finite/i);
    expect(graph.edgeCount()).toBe(1);
  });

  it("stores both directions in undirected mode and one in directed mode", () => {
    const undirected = new Graph({ directed: false });
    undirected.addVertex(0);
    undirected.addVertex(1);
    undirected.addEdge(0, 1, 3);

    expect(undirected.hasEdge(0, 1)).toBe(true);
    expect(undirected.hasEdge(1, 0)).toBe(true);
    expect(undirected.neighbors(0)).toEqual([{ to: 1, weight: 3 }]);
    expect(undirected.neighbors(1)).toEqual([{ to: 0, weight: 3 }]);
    expect(undirected.edgeCount()).toBe(1);

    const directed = new Graph({ directed: true });
    directed.addVertex(0);
    directed.addVertex(1);
    directed.addEdge(0, 1, 3);

    expect(directed.hasEdge(0, 1)).toBe(true);
    expect(directed.hasEdge(1, 0)).toBe(false);
    expect(directed.neighbors(1)).toEqual([]);
    expect(directed.edgeCount()).toBe(1);
  });

  it("clears the graph", () => {
    const graph = buildKnown();
    expect(graph.clear().ok).toBe(true);
    expect(graph.vertices()).toEqual([]);
    expect(graph.edgeCount()).toBe(0);
  });
});

describe("Graph · vertex cap", () => {
  it("accepts exactly MAX_GRAPH_VERTICES vertices and refuses the next one", () => {
    expect(MAX_GRAPH_VERTICES).toBe(64);

    const graph = new Graph();
    for (let id = 0; id < MAX_GRAPH_VERTICES; id += 1) {
      expect(graph.addVertex(id).ok).toBe(true);
    }
    expect(graph.vertexCount()).toBe(MAX_GRAPH_VERTICES);

    // The refusal carries a clear message, never throws, never mutates.
    const outcome = graph.addVertex(MAX_GRAPH_VERTICES);
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toBeTruthy();
    expect(outcome.error).toMatch(/cap/i);
    expect(outcome.error).toContain(String(MAX_GRAPH_VERTICES));
    expect(graph.vertexCount()).toBe(MAX_GRAPH_VERTICES);
    expect(graph.hasVertex(MAX_GRAPH_VERTICES)).toBe(false);
    expect(graph.toAdjacencyMatrix().matrix).toHaveLength(MAX_GRAPH_VERTICES);
    expect(graph.toAdjacencyMatrix().matrix[0]).toHaveLength(MAX_GRAPH_VERTICES);
  });

  it("keeps reporting duplicates and bad ids while at the cap", () => {
    const graph = new Graph();
    for (let id = 0; id < MAX_GRAPH_VERTICES; id += 1) graph.addVertex(id);

    expect(graph.addVertex(0).error).toMatch(/already exists/i);
    expect(graph.addVertex(1.5).error).toMatch(/whole number/i);
    expect(graph.vertexCount()).toBe(MAX_GRAPH_VERTICES);
  });

  it("frees a slot when a vertex is removed", () => {
    const graph = new Graph();
    for (let id = 0; id < MAX_GRAPH_VERTICES; id += 1) graph.addVertex(id);

    expect(graph.removeVertex(7).ok).toBe(true);
    expect(graph.vertexCount()).toBe(MAX_GRAPH_VERTICES - 1);
    expect(graph.addVertex(MAX_GRAPH_VERTICES).ok).toBe(true);
    expect(graph.vertexCount()).toBe(MAX_GRAPH_VERTICES);
  });

  it("caps directed graphs too, without blocking edges below the cap", () => {
    const graph = new Graph({ directed: true });
    for (let id = 0; id < MAX_GRAPH_VERTICES; id += 1) {
      expect(graph.addVertex(id).ok).toBe(true);
    }
    expect(graph.addEdge(0, MAX_GRAPH_VERTICES - 1, 3).ok).toBe(true);
    expect(graph.addVertex(MAX_GRAPH_VERTICES)).toMatchObject({ ok: false });
    expect(graph.vertexCount()).toBe(MAX_GRAPH_VERTICES);
    expect(graph.edgeCount()).toBe(1);
  });
});

describe("Graph · derived views", () => {
  it("lists neighbours sorted by vertex id", () => {
    const graph = new Graph();
    for (const id of [3, 1, 2, 0]) expect(graph.addVertex(id).ok).toBe(true);
    graph.addEdge(1, 3);
    graph.addEdge(1, 0);
    graph.addEdge(0, 2);

    expect(graph.vertices()).toEqual([0, 1, 2, 3]);
    expect(graph.toAdjacencyList()).toEqual([
      { vertex: 0, neighbors: [{ to: 1, weight: 1 }, { to: 2, weight: 1 }] },
      { vertex: 1, neighbors: [{ to: 0, weight: 1 }, { to: 3, weight: 1 }] },
      { vertex: 2, neighbors: [{ to: 0, weight: 1 }] },
      { vertex: 3, neighbors: [{ to: 1, weight: 1 }] },
    ]);
  });

  it("builds a 0/1 adjacency matrix when unweighted", () => {
    const graph = new Graph();
    for (const id of [0, 1, 2]) graph.addVertex(id);
    graph.addEdge(0, 1);
    graph.addEdge(1, 2);

    expect(graph.toAdjacencyMatrix()).toEqual({
      vertices: [0, 1, 2],
      matrix: [
        [0, 1, 0],
        [1, 0, 1],
        [0, 1, 0],
      ],
    });
  });

  it("builds a weighted adjacency matrix with the edge weights", () => {
    const graph = new Graph({ weighted: true });
    for (const id of [0, 1, 2]) graph.addVertex(id);
    graph.addEdge(0, 1, 5);
    graph.addEdge(1, 2, 3);

    expect(graph.toAdjacencyMatrix()).toEqual({
      vertices: [0, 1, 2],
      matrix: [
        [0, 5, 0],
        [5, 0, 3],
        [0, 3, 0],
      ],
    });
  });
});

describe("Graph · BFS", () => {
  it("produces the exact order and distances on a known graph", () => {
    const graph = buildKnown();
    const outcome = bfs(graph, 0);

    expect(outcome.error).toBeUndefined();
    expect(outcome.result.order).toEqual([0, 1, 2, 3, 4, 5]);
    expect(outcome.result.distances).toEqual({ 0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3 });
    expect(outcome.steps[outcome.steps.length - 1].distances).toEqual({
      0: 0,
      1: 1,
      2: 1,
      3: 2,
      4: 2,
      5: 3,
    });
    expectConsistentGraphOutcome(outcome);
  });

  it("never revisits a vertex on a cyclic graph", () => {
    const graph = new Graph();
    for (const id of [0, 1, 2]) graph.addVertex(id);
    graph.addEdge(0, 1);
    graph.addEdge(1, 2);
    graph.addEdge(2, 0);

    const outcome = bfs(graph, 0);
    expect(outcome.result.order).toEqual([0, 1, 2]);
    for (const step of outcome.steps) {
      expect(new Set(step.visited).size).toBe(step.visited.length);
    }
    expectConsistentGraphOutcome(outcome);
  });

  it("reports the unreachable count for a disconnected graph", () => {
    const graph = new Graph();
    for (const id of SAMPLE_GRAPH.vertices) graph.addVertex(id);
    for (const edge of SAMPLE_GRAPH.edges) graph.addEdge(edge.from, edge.to, edge.weight);

    const outcome = bfs(graph, 0);
    expect(outcome.result.order).toEqual([0, 1, 2, 3, 4]);
    expect(outcome.counters.verticesVisited).toBe(5);
    const final = outcome.steps[outcome.steps.length - 1].description;
    expect(final).toMatch(/2 unreachable/i);
    expectConsistentGraphOutcome(outcome);
  });

  it("respects edge direction", () => {
    const graph = new Graph({ directed: true });
    for (const id of [0, 1, 2]) graph.addVertex(id);
    graph.addEdge(0, 1);
    graph.addEdge(1, 2);

    expect(bfs(graph, 0).result.order).toEqual([0, 1, 2]);
    expect(bfs(graph, 2).result.order).toEqual([2]);
    expect(bfs(graph, 2).steps.at(-1)?.description).toMatch(/2 unreachable/i);
  });

  it("handles a single vertex", () => {
    const graph = new Graph();
    graph.addVertex(4);
    const outcome = bfs(graph, 4);

    expect(outcome.error).toBeUndefined();
    expect(outcome.result.order).toEqual([4]);
    expect(outcome.result.distances).toEqual({ 4: 0 });
    expect(outcome.steps.at(-1)?.description).toMatch(/0 unreachable/i);
    expectConsistentGraphOutcome(outcome);
  });

  it("returns an error for an empty graph or an invalid start", () => {
    const empty = new Graph();
    const emptyOutcome = bfs(empty, 0);
    expect(emptyOutcome.error).toBeTruthy();
    expect(emptyOutcome.result.order).toEqual([]);
    expect(emptyOutcome.counters).toEqual({ verticesVisited: 0, edgesExamined: 0 });
    expectConsistentGraphOutcome(emptyOutcome);

    const graph = buildKnown();
    const missing = bfs(graph, 99);
    expect(missing.error).toMatch(/not in the graph/i);
    expect(missing.result.order).toEqual([]);

    const fractional = bfs(graph, 1.5);
    expect(fractional.error).toMatch(/whole number/i);
    expectConsistentGraphOutcome(missing);
    expectConsistentGraphOutcome(fractional);
  });
});

describe("Graph · DFS", () => {
  it("produces the exact order on a known graph (ascending neighbours)", () => {
    const graph = buildKnown();
    const outcome = dfs(graph, 0);

    expect(outcome.error).toBeUndefined();
    expect(outcome.result.order).toEqual([0, 1, 3, 5, 2, 4]);
    expectConsistentGraphOutcome(outcome);
  });

  it("never revisits a vertex on a cyclic graph", () => {
    const graph = new Graph();
    for (const id of [0, 1, 2]) graph.addVertex(id);
    graph.addEdge(0, 1);
    graph.addEdge(1, 2);
    graph.addEdge(2, 0);

    const outcome = dfs(graph, 0);
    expect(outcome.result.order).toEqual([0, 1, 2]);
    for (const step of outcome.steps) {
      expect(new Set(step.order).size).toBe(step.order.length);
    }
    expectConsistentGraphOutcome(outcome);
  });

  it("reports the unreachable count for a disconnected graph", () => {
    const graph = new Graph();
    for (const id of SAMPLE_GRAPH.vertices) graph.addVertex(id);
    for (const edge of SAMPLE_GRAPH.edges) graph.addEdge(edge.from, edge.to, edge.weight);

    const outcome = dfs(graph, 0);
    expect(outcome.result.order).toEqual([0, 1, 2, 3, 4]);
    expect(outcome.steps.at(-1)?.description).toMatch(/2 unreachable/i);
    expectConsistentGraphOutcome(outcome);
  });

  it("respects edge direction", () => {
    const graph = new Graph({ directed: true });
    for (const id of [0, 1, 2]) graph.addVertex(id);
    graph.addEdge(0, 1);
    graph.addEdge(1, 2);

    expect(dfs(graph, 0).result.order).toEqual([0, 1, 2]);
    expect(dfs(graph, 2).result.order).toEqual([2]);
  });

  it("handles a single vertex", () => {
    const graph = new Graph();
    graph.addVertex(4);
    const outcome = dfs(graph, 4);

    expect(outcome.result.order).toEqual([4]);
    expect(outcome.steps.at(-1)?.description).toMatch(/0 unreachable/i);
    expectConsistentGraphOutcome(outcome);
  });

  it("returns an error for an empty graph or an invalid start", () => {
    const graph = new Graph();
    expect(dfs(graph, 0).error).toBeTruthy();

    const populated = buildKnown();
    const outcome = dfs(populated, 42);
    expect(outcome.error).toMatch(/not in the graph/i);
    expect(outcome.result.order).toEqual([]);
    expectConsistentGraphOutcome(outcome);
  });
});

describe("Graph · traversal invariants", () => {
  it("makes the final step equal the traversal result", () => {
    const graph = buildKnown();
    for (const outcome of [bfs(graph, 0), dfs(graph, 0)]) {
      expect(outcome.steps.at(-1)?.order).toEqual(outcome.result.order);
      expect(outcome.steps.at(-1)?.frontier).toEqual([]);
    }
  });

  it("never mutates an earlier snapshot afterwards", () => {
    const graph = buildKnown();
    const outcome = bfs(graph, 0);
    const guard = expectNoGraphMutation(outcome);

    // Run another traversal and edit the graph; the frozen stream must hold.
    dfs(graph, 3);
    graph.addVertex(6);
    graph.addEdge(5, 6);
    graph.removeEdge(0, 1);

    guard();
  });

  it("never mutates the graph it reads", () => {
    const graph = buildKnown();
    const before = graphFingerprint(graph);

    bfs(graph, 0);
    dfs(graph, 0);
    bfs(graph, 5);

    expect(graphFingerprint(graph)).toBe(before);
  });
});

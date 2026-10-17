import type {
  AdjacencyListEntry,
  AdjacencyMatrix,
  GraphEdge,
  GraphEditOutcome,
} from "./types";

export type GraphOptions = {
  /** Directed edges keep one direction; undirected edges store both. */
  directed?: boolean;
  /** Weighted mode makes the derived matrix show weights instead of 0/1. */
  weighted?: boolean;
};

/** Small helper so every refusal has the same shape. */
function refused(error: string): GraphEditOutcome {
  return { ok: false, error };
}

function succeeded(): GraphEditOutcome {
  return { ok: true };
}

/**
 * A hand-rolled graph on its own adjacency list — `Map<number, GraphEdge[]>`
 * (no adjacency-matrix-as-storage, no libraries).
 *
 * The adjacency list is the single source of truth. In undirected mode an
 * edge `u–v` is stored on BOTH `u` and `v` (each pointing at the other), so
 * `neighbors(u)` is always the complete neighbourhood. Every read view —
 * `toAdjacencyList()` and `toAdjacencyMatrix()` — is derived and sorted by
 * vertex id.
 *
 * Mutations never throw: they return `{ ok, error? }` and leave the graph
 * untouched when refused (duplicate vertex, edge to a missing vertex,
 * self-loop, duplicate edge, or removing something that is not there).
 */
export class Graph {
  private adjacency = new Map<number, GraphEdge[]>();
  private directed: boolean;
  private weighted: boolean;

  constructor(options: GraphOptions = {}) {
    this.directed = options.directed ?? false;
    this.weighted = options.weighted ?? false;
  }

  // ------------------------------------------------------------- modes --

  isDirected(): boolean {
    return this.directed;
  }

  isWeighted(): boolean {
    return this.weighted;
  }

  /** Weighted mode only affects the derived matrix and the UI's labels. */
  setWeighted(weighted: boolean): void {
    this.weighted = weighted;
  }

  /**
   * Switches between directed and undirected storage, rebuilding the
   * adjacency list from the current (unweighted-order) edge set:
   * - directed → undirected adds the mirror of every stored edge;
   * - undirected → directed keeps each edge once, from the lower id to the
   *   higher id (an undirected edge carries no direction to preserve).
   * Vertices are preserved. Weights are preserved.
   */
  setDirected(directed: boolean): void {
    if (directed === this.directed) return;

    const vertices = this.vertices();
    const edges = this.edgeList();
    this.adjacency = new Map();
    for (const vertex of vertices) this.adjacency.set(vertex, []);
    this.directed = directed;
    for (const edge of edges) this.storeEdge(edge.from, edge.to, edge.weight);
  }

  // ------------------------------------------------------------- reads --

  /** Vertex ids, ascending. */
  vertices(): number[] {
    return [...this.adjacency.keys()].sort((a, b) => a - b);
  }

  hasVertex(id: number): boolean {
    return this.adjacency.has(id);
  }

  vertexCount(): number {
    return this.adjacency.size;
  }

  /** Logical edges (an undirected edge counts once), sorted by from then to. */
  edgeCount(): number {
    return this.edgeList().length;
  }

  hasEdge(from: number, to: number): boolean {
    const list = this.adjacency.get(from);
    if (list === undefined) return false;
    return list.some((edge) => edge.to === to);
  }

  /** A copy of a vertex's neighbourhood, sorted ascending by target id. */
  neighbors(id: number): GraphEdge[] {
    const list = this.adjacency.get(id);
    if (list === undefined) return [];
    return list
      .map((edge) => ({ to: edge.to, weight: edge.weight }))
      .sort((a, b) => a.to - b.to);
  }

  /**
   * The logical edge set, sorted by from then to. An undirected edge is
   * reported once, from the lower id to the higher id.
   */
  edgeList(): Array<{ from: number; to: number; weight: number }> {
    const edges: Array<{ from: number; to: number; weight: number }> = [];
    for (const from of this.vertices()) {
      for (const edge of this.neighbors(from)) {
        if (!this.directed && from > edge.to) continue;
        edges.push({ from, to: edge.to, weight: edge.weight });
      }
    }
    return edges;
  }

  /** Derived adjacency-list view, one row per vertex, sorted by vertex id. */
  toAdjacencyList(): AdjacencyListEntry[] {
    return this.vertices().map((vertex) => ({
      vertex,
      neighbors: this.neighbors(vertex),
    }));
  }

  /**
   * Derived adjacency-matrix view over the sorted vertices. A cell is the
   * weight when the graph is weighted and 1 otherwise; 0 means "no edge".
   */
  toAdjacencyMatrix(): AdjacencyMatrix {
    const vertices = this.vertices();
    const column = new Map<number, number>();
    vertices.forEach((vertex, index) => column.set(vertex, index));

    const matrix = vertices.map(() => vertices.map(() => 0));
    for (const from of vertices) {
      const row = column.get(from);
      if (row === undefined) continue;
      for (const edge of this.neighbors(from)) {
        const col = column.get(edge.to);
        if (col === undefined) continue;
        matrix[row][col] = this.weighted ? edge.weight : 1;
      }
    }
    return { vertices, matrix };
  }

  // --------------------------------------------------------- mutations --

  /** Adds a vertex; a duplicate id is refused. */
  addVertex(id: number): GraphEditOutcome {
    if (!Number.isInteger(id)) {
      return refused("A vertex id must be a whole number.");
    }
    if (this.adjacency.has(id)) {
      return refused(`Vertex ${id} already exists.`);
    }
    this.adjacency.set(id, []);
    return succeeded();
  }

  /** Removes a vertex and every incident edge; a missing id is refused. */
  removeVertex(id: number): GraphEditOutcome {
    if (!this.adjacency.has(id)) {
      return refused(`Vertex ${id} does not exist.`);
    }
    this.adjacency.delete(id);
    for (const list of this.adjacency.values()) {
      for (let index = list.length - 1; index >= 0; index -= 1) {
        if (list[index].to === id) list.splice(index, 1);
      }
    }
    return succeeded();
  }

  /**
   * Adds an edge (weight defaults to 1). Refused for: non-integer ids, a
   * non-finite weight, either endpoint missing, a self-loop, or a duplicate
   * edge. In undirected mode the mirror direction is stored automatically.
   */
  addEdge(from: number, to: number, weight = 1): GraphEditOutcome {
    if (!Number.isInteger(from) || !Number.isInteger(to)) {
      return refused("Edge endpoints must be whole-number vertex ids.");
    }
    if (!Number.isFinite(weight)) {
      return refused("An edge weight must be a finite number.");
    }
    if (!this.adjacency.has(from)) {
      return refused(`Cannot add an edge: vertex ${from} does not exist.`);
    }
    if (!this.adjacency.has(to)) {
      return refused(`Cannot add an edge: vertex ${to} does not exist.`);
    }
    if (from === to) {
      return refused("Self-loops are not allowed.");
    }
    if (this.hasEdge(from, to)) {
      return refused(`The edge ${from} → ${to} already exists.`);
    }
    this.storeEdge(from, to, weight);
    return succeeded();
  }

  /** Removes an edge (either orientation in undirected mode); missing is refused. */
  removeEdge(from: number, to: number): GraphEditOutcome {
    if (!this.adjacency.has(from) || !this.adjacency.has(to)) {
      return refused(
        `Cannot remove an edge: vertex ${this.adjacency.has(from) ? to : from} does not exist.`,
      );
    }
    if (!this.hasEdge(from, to)) {
      return refused(`The edge ${from} → ${to} does not exist.`);
    }
    this.removeStoredEdge(from, to);
    if (!this.directed) this.removeStoredEdge(to, from);
    return succeeded();
  }

  /** Empties the graph. Always succeeds. */
  clear(): GraphEditOutcome {
    this.adjacency.clear();
    return succeeded();
  }

  // ----------------------------------------------------------- internals --

  /** Raw insert, no validation: appends both directions when undirected. */
  private storeEdge(from: number, to: number, weight: number): void {
    this.adjacency.get(from)?.push({ to, weight });
    if (!this.directed) this.adjacency.get(to)?.push({ to: from, weight });
  }

  private removeStoredEdge(from: number, to: number): void {
    const list = this.adjacency.get(from);
    if (list === undefined) return;
    const index = list.findIndex((edge) => edge.to === to);
    if (index !== -1) list.splice(index, 1);
  }
}

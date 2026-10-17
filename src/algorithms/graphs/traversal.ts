import type { Graph } from "./graph";
import type {
  GraphCounters,
  GraphStep,
  GraphTraversalOutcome,
} from "./types";

/** A refused traversal: one explanatory step, no order, zero counters. */
function refused(message: string): GraphTraversalOutcome {
  return {
    result: { order: [] },
    steps: [
      {
        visited: [],
        frontier: [],
        order: [],
        description: message,
      },
    ],
    counters: { verticesVisited: 0, edgesExamined: 0 },
    error: message,
  };
}

/** Shared start-vertex validation. Returns an error string or `null`. */
function startError(graph: Graph, start: number, name: string): string | null {
  if (graph.vertexCount() === 0) {
    return `${name} cannot run: the graph has no vertices yet.`;
  }
  if (!Number.isInteger(start)) {
    return `${name} refused: the start vertex must be a whole number.`;
  }
  if (!graph.hasVertex(start)) {
    return `${name} refused: vertex ${start} is not in the graph.`;
  }
  return null;
}

/** "0:0, 1:1, 3:2" — the shortest-distance readout for the final BFS step. */
function formatDistances(distances: Map<number, number>): string {
  return [...distances.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([vertex, distance]) => `${vertex}:${distance}`)
    .join(", ");
}

/**
 * Breadth-first search from `start`, one immutable step per event.
 *
 * Determinism: neighbours are always walked in ascending vertex order, so an
 * undirected graph with identical vertex ids always produces the same order.
 * A vertex is marked discovered the moment it is ENQUEUED, so it is never
 * enqueued twice — cycles cannot cause a revisit.
 *
 * Only the component reachable from `start` is covered; the final step states
 * how many vertices were unreachable and carries the shortest-path distance
 * (edge count) for every visited vertex.
 */
export function bfs(graph: Graph, start: number): GraphTraversalOutcome {
  const invalid = startError(graph, start, "BFS");
  if (invalid !== null) return refused(invalid);

  const counters: GraphCounters = { verticesVisited: 0, edgesExamined: 0 };
  const steps: GraphStep[] = [];

  const visited = new Set<number>([start]);
  const distance = new Map<number, number>([[start, 0]]);
  const queue: number[] = [start];
  const order: number[] = [];

  const snapshot = (description: string, current?: number): GraphStep => ({
    visited: [...visited],
    frontier: [...queue],
    current,
    order: [...order],
    description,
  });

  steps.push(
    snapshot(`Start BFS at vertex ${start}: mark it discovered and enqueue it.`),
  );

  while (queue.length > 0) {
    const vertex = queue.shift() as number;
    order.push(vertex);

    steps.push(
      snapshot(
        `Visit ${vertex} at distance ${distance.get(vertex)} — dequeue it and examine its neighbours in ascending order.`,
        vertex,
      ),
    );

    for (const edge of graph.neighbors(vertex)) {
      counters.edgesExamined += 1;
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      distance.set(edge.to, (distance.get(vertex) ?? 0) + 1);
      queue.push(edge.to);
      steps.push(
        snapshot(
          `Discover ${edge.to} from ${vertex} at distance ${distance.get(edge.to)} — enqueue it.`,
          vertex,
        ),
      );
    }
  }

  counters.verticesVisited = visited.size;
  const unreachable = graph.vertexCount() - visited.size;

  const distances: Record<number, number> = {};
  for (const [vertex, value] of [...distance.entries()].sort((a, b) => a[0] - b[0])) {
    distances[vertex] = value;
  }

  steps.push({
    visited: [...visited],
    frontier: [...queue],
    order: [...order],
    description:
      `BFS complete: visited ${visited.size} of ${graph.vertexCount()} vertices — ` +
      `${unreachable} unreachable from vertex ${start}. ` +
      `Shortest distances (edges): ${formatDistances(distance)}.`,
    distances,
  });

  return {
    result: { order: [...order], distances },
    steps,
    counters,
  };
}

/**
 * Depth-first search from `start`, iterative with an EXPLICIT stack.
 *
 * Determinism: a vertex's neighbours are pushed in descending order, so the
 * smallest neighbour ends up on top of the stack and is explored first — the
 * same ascending neighbour order BFS uses. A vertex is marked discovered when
 * it is PUSHED, so it is never pushed twice and cycles cannot cause a revisit.
 *
 * Only the component reachable from `start` is covered; the final step states
 * how many vertices were unreachable.
 */
export function dfs(graph: Graph, start: number): GraphTraversalOutcome {
  const invalid = startError(graph, start, "DFS");
  if (invalid !== null) return refused(invalid);

  const counters: GraphCounters = { verticesVisited: 0, edgesExamined: 0 };
  const steps: GraphStep[] = [];

  const visited = new Set<number>([start]);
  const stack: number[] = [start];
  const order: number[] = [];

  const snapshot = (description: string, current?: number): GraphStep => ({
    visited: [...visited],
    frontier: [...stack],
    current,
    order: [...order],
    description,
  });

  steps.push(
    snapshot(`Start DFS at vertex ${start}: mark it discovered and push it on the stack.`),
  );

  while (stack.length > 0) {
    const vertex = stack.pop() as number;
    order.push(vertex);

    steps.push(
      snapshot(
        `Visit ${vertex} — pop it from the stack and inspect its neighbours in ascending order.`,
        vertex,
      ),
    );

    const adjacent = graph.neighbors(vertex);
    for (let index = adjacent.length - 1; index >= 0; index -= 1) {
      const edge = adjacent[index];
      counters.edgesExamined += 1;
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      stack.push(edge.to);
      steps.push(
        snapshot(
          `Discover ${edge.to} from ${vertex} — push it so the smallest neighbour is explored next.`,
          vertex,
        ),
      );
    }
  }

  counters.verticesVisited = visited.size;
  const unreachable = graph.vertexCount() - visited.size;

  steps.push(
    snapshot(
      `DFS complete: visited ${visited.size} of ${graph.vertexCount()} vertices — ` +
        `${unreachable} unreachable from vertex ${start}.`,
    ),
  );

  return {
    result: { order: [...order] },
    steps,
    counters,
  };
}

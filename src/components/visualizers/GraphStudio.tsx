"use client";

import { Eraser, Plus, Share2, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import {
  Graph,
  SAMPLE_GRAPH,
  bfs,
  dfs,
  getGraphMeta,
  type GraphAlgorithm,
  type GraphStep,
  type GraphTraversalOutcome,
} from "@/algorithms/graphs";
import { PlaybackControls } from "@/components/controls/PlaybackControls";
import { SegmentedControl } from "@/components/controls/SegmentedControl";
import {
  GRAPH_VIEW_HEIGHT,
  GRAPH_VIEW_WIDTH,
  GraphCanvas,
  type GraphCanvasEdge,
  type GraphPoint,
  type GraphTone,
  type GraphTool,
} from "@/components/visualizers/GraphCanvas";
import { usePlayback } from "@/hooks/usePlayback";
import { cn, parseSingleNumber } from "@/lib/utils";

const TOOL_OPTIONS: ReadonlyArray<{ value: GraphTool; label: string }> = [
  { value: "vertex", label: "Add vertex" },
  { value: "edge", label: "Add edge" },
  { value: "delete", label: "Delete" },
];

const MODE_OPTIONS: ReadonlyArray<{ value: "directed" | "undirected"; label: string }> = [
  { value: "undirected", label: "Undirected" },
  { value: "directed", label: "Directed" },
];

const WEIGHT_OPTIONS: ReadonlyArray<{ value: "on" | "off"; label: string }> = [
  { value: "off", label: "Unweighted" },
  { value: "on", label: "Weighted" },
];

const TOOL_BUTTON_CLASS =
  "flex h-10 items-center gap-2 rounded-md border border-line bg-surface-2 px-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink transition-colors hover:border-white/20 hover:bg-[#1c1c1c] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-surface-2";

const INPUT_CLASS =
  "w-full rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] tracking-tight text-ink placeholder:text-ink-muted/60";

/** Deterministic position for a vertex added by id (clicking the canvas uses the click point). */
function gridPosition(index: number): GraphPoint {
  const columns = 6;
  return {
    x: 120 + (index % columns) * 108,
    y: 100 + Math.floor(index / columns) * 96,
  };
}

/**
 * Lays out connected components on their own vertical band of the canvas, each
 * component arranged in a circle. Used when loading the sample graph (and any
 * future bulk load) so a separate component reads as visually separate.
 */
function layoutComponents(
  vertices: number[],
  edges: Array<{ from: number; to: number }>,
): Map<number, GraphPoint> {
  const adjacency = new Map<number, number[]>();
  for (const id of vertices) adjacency.set(id, []);
  for (const edge of edges) {
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }

  const seen = new Set<number>();
  const components: number[][] = [];
  for (const id of vertices) {
    if (seen.has(id)) continue;
    const component: number[] = [];
    const stack = [id];
    seen.add(id);
    while (stack.length > 0) {
      const vertex = stack.pop() as number;
      component.push(vertex);
      for (const neighbor of adjacency.get(vertex) ?? []) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    components.push(component.sort((a, b) => a - b));
  }

  const positions = new Map<number, GraphPoint>();
  const columnWidth = GRAPH_VIEW_WIDTH / Math.max(components.length, 1);
  components.forEach((component, column) => {
    const centerX = columnWidth * (column + 0.5);
    const centerY = GRAPH_VIEW_HEIGHT / 2;
    const radius = Math.min(columnWidth, GRAPH_VIEW_HEIGHT) / 2 - 62;
    component.forEach((id, index) => {
      if (component.length === 1) {
        positions.set(id, { x: centerX, y: centerY });
        return;
      }
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / component.length;
      positions.set(id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });
  });
  return positions;
}

/** Parses a non-negative whole-number vertex id, or returns `null`. */
function parseVertexId(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

/** Ordered chips used by the live frontier / order / distance views. */
function ChipRow({ items, label, empty }: { items: number[]; label: string; empty: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="label">{label}</p>
        <span className="font-mono text-[10px] tracking-tight text-ink-muted">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 font-mono text-[12px] tracking-tight text-ink-muted">{empty}</p>
      ) : (
        <ol className="mt-2 flex flex-wrap gap-1.5" aria-label={label}>
          {items.map((value, index) => (
            <li
              key={`${label}-${index}-${value}`}
              className="flex h-7 min-w-8 items-center justify-center rounded-md border border-line bg-surface-2 px-2 font-mono text-[12px] tracking-tight text-ink"
            >
              {value}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

type LegendItem = { swatch: string; label: string };

const LEGEND: LegendItem[] = [
  { swatch: "border border-accent/70 bg-accent/15", label: "Current" },
  { swatch: "border border-white/30 bg-white/5", label: "Frontier" },
  { swatch: "border border-sorted/70 bg-sorted/20", label: "Visited" },
  { swatch: "border border-line bg-surface-2", label: "Unvisited" },
];

/**
 * Graph Studio: an SVG editor over the hand-rolled `Graph` engine plus a
 * traversal panel. The engine is pure (no React/DOM); this component owns the
 * editor state (vertex positions, the active tool, the pending edge) and plays
 * the engine's immutable step stream back through the shared `usePlayback`.
 *
 * Import invariant, shared with the other labs: user edits mutate the engine
 * and reset the traversal, while traversals only ever read the graph.
 */
export function GraphStudio() {
  const meta = getGraphMeta();
  // One persistent graph — never recreated between edits.
  const [graph] = useState(() => new Graph({ directed: false, weighted: false }));
  // Bumped after every edit/toggle so the derived views re-read the engine.
  // The value itself is unused: the bump is what forces the re-render.
  const [, setVersion] = useState(0);

  const vertices = graph.vertices();
  const edges = graph.edgeList();
  const adjacency = graph.toAdjacencyList();
  const matrix = graph.toAdjacencyMatrix();
  const directed = graph.isDirected();
  const weighted = graph.isWeighted();

  // Positions are UI state only — the engine knows nothing about geometry.
  const [positions, setPositions] = useState<Map<number, GraphPoint>>(new Map());
  const [tool, setTool] = useState<GraphTool>("vertex");
  const [pendingFrom, setPendingFrom] = useState<number | null>(null);

  const [steps, setSteps] = useState<GraphStep[]>([]);
  const [lastOutcome, setLastOutcome] = useState<GraphTraversalOutcome | null>(null);
  const [ranAlgorithm, setRanAlgorithm] = useState<GraphAlgorithm | null>(null);
  const [algorithm, setAlgorithm] = useState<GraphAlgorithm>("bfs");
  const [start, setStart] = useState<number | null>(null);
  const [comparison, setComparison] = useState<{
    start: number;
    bfs: number[];
    dfs: number[];
  } | null>(null);

  const [vertexInput, setVertexInput] = useState("");
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [weightInput, setWeightInput] = useState("1");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  const playback = usePlayback(steps);
  const currentStep = steps.at(playback.index) ?? null;

  const selectedStart =
    start !== null && vertices.includes(start) ? start : (vertices[0] ?? null);

  // --------------------------------------------------------- edit helpers --

  const acceptEdit = () => {
    setOperationError(null);
    setVersion((value) => value + 1);
    // A graph change during playback resets the traversal.
    setSteps([]);
    setLastOutcome(null);
    setRanAlgorithm(null);
    setComparison(null);
    setPendingFrom(null);
  };

  const rejectEdit = (error: string | undefined) => {
    setOperationError(error ?? "Operation refused.");
  };

  const nextVertexId = () =>
    vertices.length === 0 ? 0 : Math.max(...vertices) + 1;

  const promptWeight = (from: number, to: number): number | null => {
    const fallback = weightInput.trim() === "" ? "1" : weightInput.trim();
    if (typeof window === "undefined" || typeof window.prompt !== "function") {
      const value = Number(fallback);
      return Number.isFinite(value) ? value : 1;
    }
    const answer = window.prompt(`Weight for edge ${from} → ${to}`, fallback);
    if (answer === null) return null;
    const value = Number(answer.trim());
    if (answer.trim() === "" || !Number.isFinite(value)) {
      setOperationError(`"${answer}" is not a valid weight — the edge was not added.`);
      return null;
    }
    setWeightInput(String(value));
    return value;
  };

  // ------------------------------------------------------------ canvas ops --

  const addVertexAt = (point: GraphPoint) => {
    const id = nextVertexId();
    const outcome = graph.addVertex(id);
    if (!outcome.ok) {
      rejectEdit(outcome.error);
      return;
    }
    setPositions((previous) => new Map(previous).set(id, point));
    acceptEdit();
  };

  const handleVertexClick = (id: number) => {
    if (tool === "delete") {
      const outcome = graph.removeVertex(id);
      if (!outcome.ok) {
        rejectEdit(outcome.error);
        return;
      }
      setPositions((previous) => {
        const next = new Map(previous);
        next.delete(id);
        return next;
      });
      acceptEdit();
      return;
    }

    if (tool === "edge") {
      if (pendingFrom === null) {
        setPendingFrom(id);
        setOperationError(null);
        return;
      }
      if (pendingFrom === id) {
        setPendingFrom(null);
        rejectEdit("Self-loops are not allowed — pick a different vertex.");
        return;
      }
      const from = pendingFrom;
      setPendingFrom(null);
      let weight = 1;
      if (graph.isWeighted()) {
        const prompted = promptWeight(from, id);
        if (prompted === null) return;
        weight = prompted;
      }
      const outcome = graph.addEdge(from, id, weight);
      if (!outcome.ok) {
        rejectEdit(outcome.error);
        return;
      }
      acceptEdit();
    }
  };

  const handleEdgeClick = (from: number, to: number) => {
    if (tool !== "delete") return;
    const outcome = graph.removeEdge(from, to);
    if (!outcome.ok) {
      rejectEdit(outcome.error);
      return;
    }
    acceptEdit();
  };

  const handleBackgroundClick = (point: GraphPoint) => {
    if (tool === "edge") {
      setPendingFrom(null);
      return;
    }
    if (tool === "delete") return;
    addVertexAt(point);
  };

  const handleVertexMove = (id: number, point: GraphPoint) => {
    setPositions((previous) => new Map(previous).set(id, point));
  };

  // ---------------------------------------------------------- toolbar ops --

  const changeMode = (value: "directed" | "undirected") => {
    graph.setDirected(value === "directed");
    acceptEdit();
  };

  const changeWeighted = (value: "on" | "off") => {
    graph.setWeighted(value === "on");
    acceptEdit();
  };

  const loadSample = () => {
    graph.clear();
    graph.setDirected(SAMPLE_GRAPH.directed);
    graph.setWeighted(SAMPLE_GRAPH.weighted);
    for (const id of SAMPLE_GRAPH.vertices) {
      const outcome = graph.addVertex(id);
      if (!outcome.ok) {
        rejectEdit(outcome.error);
        return;
      }
    }
    for (const edge of SAMPLE_GRAPH.edges) {
      const outcome = graph.addEdge(edge.from, edge.to, edge.weight ?? 1);
      if (!outcome.ok) {
        rejectEdit(outcome.error);
        return;
      }
    }
    setPositions(
      layoutComponents(
        SAMPLE_GRAPH.vertices,
        SAMPLE_GRAPH.edges.map((edge) => ({ from: edge.from, to: edge.to })),
      ),
    );
    setStart(SAMPLE_GRAPH.vertices[0] ?? null);
    acceptEdit();
  };

  const clearAll = () => {
    graph.clear();
    setPositions(new Map());
    setStart(null);
    acceptEdit();
  };

  const addVertexById = () => {
    const id = parseVertexId(vertexInput);
    if (id === null) {
      setFieldError("A vertex id must be a whole number, 0 or greater.");
      setOperationError(null);
      return;
    }
    const outcome = graph.addVertex(id);
    if (!outcome.ok) {
      rejectEdit(outcome.error);
      return;
    }
    setPositions((previous) => new Map(previous).set(id, gridPosition(vertices.length)));
    setFieldError(null);
    acceptEdit();
  };

  const addEdgeById = () => {
    const from = parseVertexId(edgeFrom);
    const to = parseVertexId(edgeTo);
    if (from === null || to === null) {
      setFieldError("Edge endpoints must be whole-number vertex ids.");
      setOperationError(null);
      return;
    }
    let weight = 1;
    if (graph.isWeighted()) {
      const parsed = parseSingleNumber(weightInput);
      if (!parsed.ok) {
        setFieldError(parsed.error);
        setOperationError(null);
        return;
      }
      weight = parsed.value;
    }
    setFieldError(null);
    const outcome = graph.addEdge(from, to, weight);
    if (!outcome.ok) {
      rejectEdit(outcome.error);
      return;
    }
    acceptEdit();
  };

  // ------------------------------------------------------------ traversal --

  const runTraversal = () => {
    if (selectedStart === null) {
      setOperationError("Add a vertex before running a traversal.");
      return;
    }
    const outcome = algorithm === "bfs" ? bfs(graph, selectedStart) : dfs(graph, selectedStart);
    setSteps(outcome.steps);
    setLastOutcome(outcome);
    setRanAlgorithm(algorithm);
    setComparison(null);
    setOperationError(outcome.error ?? null);
  };

  const runComparison = () => {
    if (selectedStart === null) {
      setOperationError("Add a vertex before comparing BFS and DFS.");
      return;
    }
    const bfsOutcome = bfs(graph, selectedStart);
    const dfsOutcome = dfs(graph, selectedStart);
    setComparison({
      start: selectedStart,
      bfs: bfsOutcome.result.order,
      dfs: dfsOutcome.result.order,
    });
    setOperationError(bfsOutcome.error ?? dfsOutcome.error ?? null);
  };

  // -------------------------------------------------------------- highlight --

  const currentSet = new Set<number>();
  const frontierSet = new Set<number>();
  const visitedSet = new Set<number>();
  if (currentStep !== null) {
    if (currentStep.current !== undefined) currentSet.add(currentStep.current);
    for (const id of currentStep.frontier) frontierSet.add(id);
    for (const id of currentStep.visited) visitedSet.add(id);
  }
  const toneOf = (id: number): GraphTone => {
    if (currentSet.has(id)) return "accent";
    if (frontierSet.has(id)) return "frontier";
    if (visitedSet.has(id)) return "visited";
    return "default";
  };

  const frontierLabel = ranAlgorithm === "dfs" ? "Stack" : "Queue";
  const frontierEmpty =
    ranAlgorithm === "dfs" ? "— stack is empty" : "— queue is empty";
  const canvasEdges: GraphCanvasEdge[] = edges;

  const fieldHintId = "graph-field-hint";
  const fieldErrorId = "graph-field-error";
  const fieldDescribedBy =
    fieldError !== null ? `${fieldHintId} ${fieldErrorId}` : fieldHintId;
  const traversalDisabled = vertices.length === 0 || selectedStart === null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="label">Module 04 · Graphs</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink">
            Graph Studio · Traversals
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{meta.summary}</p>
        </div>

        <div className="max-w-xs rounded-md border border-line bg-surface px-4 py-3">
          <p className="label">Representations</p>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
            The engine stores an adjacency list; the list and matrix views below are both
            derived from it, sorted by vertex id.
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Editor */}
          <section className="panel p-5" aria-labelledby="graph-editor-heading">
            <div className="flex items-center justify-between gap-4">
              <h2 id="graph-editor-heading" className="label">
                Editor
              </h2>
              <span className="font-mono text-[11px] tracking-tight text-ink-muted">
                {vertices.length} vert{vertices.length === 1 ? "ex" : "ices"} · {edges.length}{" "}
                edge{edges.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div>
                <p className="label mb-2">Tool</p>
                <SegmentedControl
                  label="Graph tool"
                  value={tool}
                  options={TOOL_OPTIONS}
                  onChange={setTool}
                />
              </div>
              <div>
                <p className="label mb-2">Direction</p>
                <SegmentedControl
                  label="Edge direction"
                  value={directed ? "directed" : "undirected"}
                  options={MODE_OPTIONS}
                  onChange={changeMode}
                />
              </div>
              <div>
                <p className="label mb-2">Weights</p>
                <SegmentedControl
                  label="Weighted mode"
                  value={weighted ? "on" : "off"}
                  options={WEIGHT_OPTIONS}
                  onChange={changeWeighted}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="w-28">
                <label htmlFor="graph-weight" className="label">
                  Weight
                </label>
                <input
                  id="graph-weight"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={weightInput}
                  disabled={!weighted}
                  onChange={(event) => setWeightInput(event.target.value)}
                  className={cn(INPUT_CLASS, "mt-2", !weighted && "opacity-50")}
                />
              </div>
              <button type="button" onClick={loadSample} className={TOOL_BUTTON_CLASS}>
                <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
                Load sample graph
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={vertices.length === 0}
                className={TOOL_BUTTON_CLASS}
              >
                <Eraser size={14} strokeWidth={1.75} aria-hidden="true" />
                Clear
              </button>
            </div>

            {operationError !== null ? (
              <p
                role="alert"
                className="mt-3 flex items-center gap-2 font-mono text-[11px] tracking-tight text-accent"
              >
                <TriangleAlert size={13} strokeWidth={1.75} aria-hidden="true" />
                {operationError}
              </p>
            ) : null}

            <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
              {tool === "edge"
                ? pendingFrom === null
                  ? "Add edge: click vertex A, then vertex B. Weighted mode prompts for a weight."
                  : `Edge from vertex ${pendingFrom} — click the destination vertex (click empty space to cancel).`
                : tool === "delete"
                  ? "Delete: click a vertex to remove it and its edges, or click an edge to remove just that edge."
                  : "Add vertex: click empty space to place a new vertex. Drag any vertex to move it."}
            </p>

            <div className="mt-4 overflow-hidden rounded-md border border-line">
              <GraphCanvas
                vertices={vertices}
                edges={canvasEdges}
                positions={positions}
                directed={directed}
                weighted={weighted}
                toneOf={toneOf}
                pendingFrom={pendingFrom}
                tool={tool}
                emptyMessage={meta.emptyMessage}
                ariaLabel={
                  steps.length === 0
                    ? undefined
                    : `Graph with ${vertices.length} vertices and ${edges.length} edges, step ${playback.index + 1} of ${steps.length}`
                }
                onVertexClick={handleVertexClick}
                onEdgeClick={handleEdgeClick}
                onBackgroundClick={handleBackgroundClick}
                onVertexMove={handleVertexMove}
              />
            </div>

            <ul className="mt-3 flex flex-wrap items-center gap-3">
              {LEGEND.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted"
                >
                  <span className={cn("h-2.5 w-2.5 rounded-[3px]", item.swatch)} aria-hidden="true" />
                  {item.label}
                </li>
              ))}
            </ul>

            {/* Live views under the canvas */}
            <div className="mt-5 grid gap-5 border-t border-line pt-4 sm:grid-cols-3">
              <ChipRow
                items={currentStep?.frontier ?? []}
                label={frontierLabel}
                empty={frontierEmpty}
              />
              <ChipRow
                items={currentStep?.order ?? []}
                label="Visit order"
                empty="— not started"
              />
              <div className="min-w-0">
                <p className="label">BFS distances</p>
                {ranAlgorithm !== "bfs" ? (
                  <p className="mt-2 font-mono text-[12px] tracking-tight text-ink-muted">
                    — run BFS to see distances
                  </p>
                ) : currentStep?.distances === undefined ? (
                  <p className="mt-2 font-mono text-[12px] tracking-tight text-ink-muted">
                    — shown on the final step
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(currentStep.distances).map(([vertex, distance]) => (
                      <li
                        key={`dist-${vertex}`}
                        className="flex h-7 items-center gap-1 rounded-md border border-line bg-surface-2 px-2 font-mono text-[12px] tracking-tight text-ink"
                      >
                        <span className="text-ink-muted">{vertex}</span>
                        <span className="text-accent">→</span>
                        {distance}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Keyboard / mobile inputs */}
            <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <div>
                <p className="label mb-2">Add vertex by id</p>
                <div className="flex items-end gap-2">
                  <div className="w-24">
                    <label htmlFor="graph-vertex-id" className="sr-only">
                      Vertex id
                    </label>
                    <input
                      id="graph-vertex-id"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={vertexInput}
                      placeholder="7"
                      aria-describedby={fieldDescribedBy}
                      onChange={(event) => {
                        setVertexInput(event.target.value);
                        if (fieldError) setFieldError(null);
                      }}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <button type="button" onClick={addVertexById} className={TOOL_BUTTON_CLASS}>
                    <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
                    Add
                  </button>
                </div>
              </div>

              <div>
                <p className="label mb-2">Add edge by id</p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-20">
                    <label htmlFor="graph-edge-from" className="sr-only">
                      From vertex
                    </label>
                    <input
                      id="graph-edge-from"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={edgeFrom}
                      placeholder="from"
                      aria-describedby={fieldDescribedBy}
                      onChange={(event) => {
                        setEdgeFrom(event.target.value);
                        if (fieldError) setFieldError(null);
                      }}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="w-20">
                    <label htmlFor="graph-edge-to" className="sr-only">
                      To vertex
                    </label>
                    <input
                      id="graph-edge-to"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={edgeTo}
                      placeholder="to"
                      aria-describedby={fieldDescribedBy}
                      onChange={(event) => {
                        setEdgeTo(event.target.value);
                        if (fieldError) setFieldError(null);
                      }}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <button type="button" onClick={addEdgeById} className={TOOL_BUTTON_CLASS}>
                    <Share2 size={14} strokeWidth={1.75} aria-hidden="true" />
                    Add edge
                  </button>
                </div>
              </div>
            </div>

            <p id={fieldHintId} className="mt-3 text-[11px] leading-relaxed text-ink-muted">
              Vertex ids and edge endpoints are whole numbers, 0 or greater. Edge weights come
              from the weight field above.
            </p>

            {fieldError !== null ? (
              <p
                id={fieldErrorId}
                role="alert"
                className="mt-2 font-mono text-[11px] tracking-tight text-accent"
              >
                {fieldError}
              </p>
            ) : null}
          </section>

          {/* Traversal */}
          <section className="panel p-5" aria-labelledby="graph-traversal-heading">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 id="graph-traversal-heading" className="label">
                Traversal
              </h2>
              <SegmentedControl
                label="Traversal algorithm"
                value={algorithm}
                options={[
                  { value: "bfs", label: "BFS" },
                  { value: "dfs", label: "DFS" },
                ]}
                onChange={setAlgorithm}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="w-32">
                <label htmlFor="graph-start" className="label">
                  Start vertex
                </label>
                <select
                  id="graph-start"
                  value={selectedStart ?? ""}
                  disabled={vertices.length === 0}
                  onChange={(event) => setStart(Number(event.target.value))}
                  className={cn(INPUT_CLASS, "mt-2 disabled:opacity-50")}
                >
                  {vertices.length === 0 ? <option value="">none</option> : null}
                  {vertices.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={runTraversal}
                disabled={traversalDisabled}
                className={cn(
                  TOOL_BUTTON_CLASS,
                  "border-accent/50 text-accent hover:border-accent/70",
                )}
              >
                {algorithm === "bfs" ? "Run BFS" : "Run DFS"}
              </button>
              <button
                type="button"
                onClick={runComparison}
                disabled={traversalDisabled}
                className={cn(TOOL_BUTTON_CLASS, "border-line")}
              >
                Run both on same start
              </button>
            </div>

            <div className="mt-5">
              <PlaybackControls
                playing={playback.playing}
                atStart={playback.atStart}
                atEnd={playback.atEnd}
                disabled={steps.length === 0}
                speed={playback.speed}
                onPlay={playback.play}
                onPause={playback.pause}
                onNext={playback.next}
                onPrevious={playback.previous}
                onReset={playback.reset}
                onSpeedChange={playback.setSpeed}
              />
            </div>
          </section>

          {comparison !== null ? (
            <section className="panel p-5" aria-labelledby="graph-compare-heading">
              <div className="flex items-center justify-between gap-4">
                <h2 id="graph-compare-heading" className="label">
                  BFS vs DFS · start {comparison.start}
                </h2>
                <span className="font-mono text-[10px] tracking-tight text-ink-muted">
                  {comparison.bfs.length} visited
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-line bg-surface-2 p-4">
                  <p className="label">BFS order</p>
                  <p className="mt-2 font-mono text-[13px] tracking-tight text-ink">
                    {comparison.bfs.join(" → ")}
                  </p>
                </div>
                <div className="rounded-md border border-line bg-surface-2 p-4">
                  <p className="label">DFS order</p>
                  <p className="mt-2 font-mono text-[13px] tracking-tight text-ink">
                    {comparison.dfs.join(" → ")}
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        {/* Side panel */}
        <aside className="min-w-0 space-y-5" aria-label="Graph inspector">
          <section className="panel p-5" aria-labelledby="graph-list-heading">
            <h2 id="graph-list-heading" className="label">
              Adjacency list
            </h2>
            {adjacency.length === 0 ? (
              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                No vertices yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {adjacency.map((row) => (
                  <li
                    key={row.vertex}
                    className="flex items-baseline gap-2 font-mono text-[12px] tracking-tight"
                  >
                    <span className="flex h-6 min-w-6 items-center justify-center rounded border border-line bg-surface-2 px-1 text-ink">
                      {row.vertex}
                    </span>
                    <span className="text-ink-muted">→</span>
                    <span className="text-ink">
                      {row.neighbors.length === 0
                        ? "∅"
                        : row.neighbors
                            .map((neighbor) =>
                              weighted
                                ? `${neighbor.to}(w${neighbor.weight})`
                                : `${neighbor.to}`,
                            )
                            .join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">{meta.listNote}</p>
          </section>

          <section className="panel p-5" aria-labelledby="graph-matrix-heading">
            <h2 id="graph-matrix-heading" className="label">
              Adjacency matrix
            </h2>
            {matrix.vertices.length === 0 ? (
              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                No vertices yet.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="border-collapse font-mono text-[11px] tracking-tight">
                  <thead>
                    <tr>
                      <th className="p-1 text-ink-muted" aria-label="from / to" />
                      {matrix.vertices.map((vertex) => (
                        <th key={vertex} className="p-1 text-center text-ink-muted">
                          {vertex}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.matrix.map((row, index) => (
                      <tr key={matrix.vertices[index]}>
                        <th className="p-1 text-right text-ink-muted">
                          {matrix.vertices[index]}
                        </th>
                        {row.map((cell, column) => (
                          <td
                            key={column}
                            className={cn(
                              "min-w-7 border border-line px-1 py-1 text-center",
                              cell !== 0 ? "text-ink" : "text-ink-muted/50",
                            )}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">{meta.matrixNote}</p>
          </section>

          <section className="panel p-5" aria-labelledby="graph-counters-heading">
            <h2 id="graph-counters-heading" className="label">
              Counters
            </h2>
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="text-[12px] tracking-tight text-ink-muted">Vertices visited</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">
                  {lastOutcome?.counters.verticesVisited ?? 0}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[12px] tracking-tight text-ink-muted">Edges examined</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">
                  {lastOutcome?.counters.edgesExamined ?? 0}
                </dd>
              </div>
            </dl>
          </section>

          <section className="panel p-5" aria-labelledby="graph-step-heading">
            <h2 id="graph-step-heading" className="label">
              Current step
            </h2>
            <p
              className="mt-3 min-h-[4.5rem] text-[13px] leading-relaxed text-ink"
              aria-live="polite"
              aria-atomic="true"
            >
              {currentStep?.description ??
                "Run a traversal to generate its step stream, then play it back here."}
            </p>
            <p className="mt-2 font-mono text-[11px] tracking-tight text-ink-muted">
              {steps.length === 0
                ? "No steps yet"
                : `Step ${playback.index + 1} / ${steps.length}`}
            </p>
          </section>

          <section className="panel p-5" aria-labelledby="graph-complexity-heading">
            <h2 id="graph-complexity-heading" className="label">
              Complexity
            </h2>
            <p className="mt-3 text-[13px] font-medium tracking-tight text-ink">{meta.name}</p>
            <dl className="mt-3 space-y-2">
              {meta.complexity.map((row) => (
                <div
                  key={row.term}
                  className="flex items-baseline justify-between gap-4 border-b border-line pb-2 last:border-none last:pb-0"
                >
                  <dt className="text-[12px] tracking-tight text-ink-muted">{row.term}</dt>
                  <dd className="font-mono text-[12px] tracking-tight text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 rounded-md border border-line bg-surface-2 p-4">
              <p className="label">Both traversals</p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
                BFS and DFS both run in O(V + E) time with O(V) extra space; BFS uses a queue and
                finds shortest paths in edge counts, while DFS uses a stack (here, an explicit one)
                and the same O(V) memory.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

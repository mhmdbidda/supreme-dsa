"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";

/** SVG user-space size; the element scales responsively around this viewBox. */
export const GRAPH_VIEW_WIDTH = 760;
export const GRAPH_VIEW_HEIGHT = 500;

const NODE_RADIUS = 18;
/** How far the pointer may move before a press counts as a drag, not a click. */
const DRAG_THRESHOLD = 4;
/** Half-angle of the directed-edge arrowhead, in radians. */
const ARROW_SPREAD = 0.42;
const ARROW_SIZE = 10;

/** Best-effort pointer capture so a drag keeps tracking outside the svg. */
function capturePointer(svg: SVGSVGElement | null, pointerId: number): void {
  try {
    svg?.setPointerCapture(pointerId);
  } catch {
    // Capture is a nicety; without it the svg's own move events still work.
  }
}

export type GraphTone = "default" | "accent" | "frontier" | "visited";

export type GraphPoint = { x: number; y: number };

export type GraphTool = "vertex" | "edge" | "delete";

export type GraphCanvasEdge = { from: number; to: number; weight: number };

export type GraphCanvasProps = {
  vertices: number[];
  edges: GraphCanvasEdge[];
  positions: ReadonlyMap<number, GraphPoint>;
  directed: boolean;
  weighted: boolean;
  toneOf: (id: number) => GraphTone;
  pendingFrom: number | null;
  tool: GraphTool;
  /** Shown centred over the canvas while the graph has no vertices. */
  emptyMessage: string;
  onVertexClick: (id: number) => void;
  onEdgeClick: (from: number, to: number) => void;
  onBackgroundClick: (point: GraphPoint) => void;
  onVertexMove: (id: number, point: GraphPoint) => void;
};

/** Colour precedence per vertex: accent > frontier > visited > default. */
const PALETTE = {
  edge: "rgba(255, 255, 255, 0.12)",
  edgeBright: "rgba(255, 255, 255, 0.24)",
  weight: "#8a8a8a",
  canvas: "#0d0d0d",
  defaultFill: "#161616",
  defaultStroke: "rgba(255, 255, 255, 0.18)",
  defaultText: "#ededed",
  accentFill: "rgba(242, 181, 68, 0.14)",
  accentStroke: "rgba(242, 181, 68, 0.8)",
  accentText: "#f2b544",
  frontierFill: "rgba(255, 255, 255, 0.07)",
  frontierStroke: "rgba(255, 255, 255, 0.34)",
  frontierText: "#c9c9c9",
  visitedFill: "rgba(85, 128, 95, 0.16)",
  visitedStroke: "rgba(85, 128, 95, 0.75)",
  visitedText: "#8fbf9b",
} as const;

type ToneStyle = {
  fill: string;
  stroke: string;
  text: string;
};

const TONES: Record<GraphTone, ToneStyle> = {
  default: {
    fill: PALETTE.defaultFill,
    stroke: PALETTE.defaultStroke,
    text: PALETTE.defaultText,
  },
  accent: {
    fill: PALETTE.accentFill,
    stroke: PALETTE.accentStroke,
    text: PALETTE.accentText,
  },
  frontier: {
    fill: PALETTE.frontierFill,
    stroke: PALETTE.frontierStroke,
    text: PALETTE.frontierText,
  },
  visited: {
    fill: PALETTE.visitedFill,
    stroke: PALETTE.visitedStroke,
    text: PALETTE.visitedText,
  },
};

/** Designed empty state, centred over the canvas (clicks still pass through). */
function EmptyGraph({ message }: { message: string }) {
  const [title, ...rest] = message.split(" — ");
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <p className="text-sm font-medium tracking-tight text-ink">{title}</p>
        {rest.length > 0 ? (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{rest.join(" — ")}</p>
        ) : null}
        <p className="mt-3 font-mono text-[12px] tracking-tight text-ink-muted" aria-hidden="true">
          V = {"{}"} · E = {"{}"}
        </p>
      </div>
    </div>
  );
}

type VertexSession = {
  kind: "vertex";
  id: number;
  offsetX: number;
  offsetY: number;
  pressX: number;
  pressY: number;
  moved: boolean;
};

type BackgroundSession = {
  kind: "background";
  pressX: number;
  pressY: number;
  moved: boolean;
};

type PointerSession = VertexSession | BackgroundSession | null;

/**
 * The graph drawn as SVG: circles for vertices, hairline lines (with
 * arrowheads and weight labels) for edges. Positions come from the caller —
 * they are UI state, never part of the engine.
 *
 * Pointer handling lives here so the parent only hears semantic events:
 * a background click (add a vertex / clear a pending edge), a vertex click
 * (pick or delete a vertex), an edge click (delete an edge) and a vertex drag
 * (move a vertex). A press counts as a click unless the pointer moves more
 * than a few pixels first.
 */
export function GraphCanvas({
  vertices,
  edges,
  positions,
  directed,
  weighted,
  toneOf,
  pendingFrom,
  tool,
  emptyMessage,
  onVertexClick,
  onEdgeClick,
  onBackgroundClick,
  onVertexMove,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const sessionRef = useRef<PointerSession>(null);

  const positionOf = (id: number): GraphPoint =>
    positions.get(id) ?? { x: GRAPH_VIEW_WIDTH / 2, y: GRAPH_VIEW_HEIGHT / 2 };

  const toPoint = (event: ReactPointerEvent<SVGSVGElement>): GraphPoint => {
    const svg = svgRef.current;
    if (svg === null) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = rect.width === 0 ? 1 : GRAPH_VIEW_WIDTH / rect.width;
    const scaleY = rect.height === 0 ? 1 : GRAPH_VIEW_HEIGHT / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const point = toPoint(event);
    const target = event.target as Element;
    const svg = svgRef.current;

    const vertexEl = target.closest("[data-vertex]");
    if (vertexEl !== null) {
      const id = Number(vertexEl.getAttribute("data-vertex"));
      const position = positionOf(id);
      sessionRef.current = {
        kind: "vertex",
        id,
        offsetX: position.x - point.x,
        offsetY: position.y - point.y,
        pressX: point.x,
        pressY: point.y,
        moved: false,
      };
      capturePointer(svg, event.pointerId);
      return;
    }

    const edgeEl = target.closest("[data-edge]");
    if (edgeEl !== null) {
      if (tool === "delete") {
        onEdgeClick(
          Number(edgeEl.getAttribute("data-from")),
          Number(edgeEl.getAttribute("data-to")),
        );
      }
      return;
    }

    sessionRef.current = {
      kind: "background",
      pressX: point.x,
      pressY: point.y,
      moved: false,
    };
    capturePointer(svg, event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const session = sessionRef.current;
    if (session === null) return;
    const point = toPoint(event);
    const distance = Math.hypot(point.x - session.pressX, point.y - session.pressY);
    if (!session.moved && distance > DRAG_THRESHOLD) session.moved = true;
    if (session.kind === "vertex" && session.moved) {
      onVertexMove(session.id, {
        x: point.x + session.offsetX,
        y: point.y + session.offsetY,
      });
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session === null) return;
    try {
      svgRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already be gone — a release failure is harmless.
    }

    if (session.kind === "vertex") {
      if (!session.moved) onVertexClick(session.id);
      return;
    }
    if (!session.moved) onBackgroundClick(toPoint(event));
  };

  const cancelSession = () => {
    sessionRef.current = null;
  };

  const cursor =
    tool === "delete" ? "cursor-pointer" : tool === "edge" ? "cursor-crosshair" : "cursor-copy";

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${GRAPH_VIEW_WIDTH} ${GRAPH_VIEW_HEIGHT}`}
        role="img"
        aria-label={`Graph with ${vertices.length} vertices and ${edges.length} edges`}
        className={`block h-auto w-full touch-none select-none ${cursor}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelSession}
      >
        <rect
          x={0}
          y={0}
          width={GRAPH_VIEW_WIDTH}
          height={GRAPH_VIEW_HEIGHT}
          fill={PALETTE.canvas}
        />

        {/* Edge hit areas sit under the visible lines but above the canvas. */}
        {edges.map((edge) => {
          const from = positionOf(edge.from);
          const to = positionOf(edge.to);
          return (
            <line
              key={`hit-${edge.from}-${edge.to}`}
              data-edge="1"
              data-from={edge.from}
              data-to={edge.to}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="transparent"
              strokeWidth={16}
              style={{ pointerEvents: tool === "delete" ? "stroke" : "none" }}
            />
          );
        })}

        {edges.map((edge) => {
          const from = positionOf(edge.from);
          const to = positionOf(edge.to);
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.hypot(dx, dy) || 1;
          const ux = dx / length;
          const uy = dy / length;
          const start = { x: from.x + ux * NODE_RADIUS, y: from.y + uy * NODE_RADIUS };
          const tip = { x: to.x - ux * NODE_RADIUS, y: to.y - uy * NODE_RADIUS };
          const bright = toneOf(edge.from) !== "default" && toneOf(edge.to) !== "default";

          const mid = { x: (start.x + tip.x) / 2, y: (start.y + tip.y) / 2 };
          const label = {
            x: mid.x - uy * 13,
            y: mid.y + ux * 13,
          };

          const angle = Math.atan2(uy, ux);
          const left = {
            x: tip.x - Math.cos(angle - ARROW_SPREAD) * ARROW_SIZE,
            y: tip.y - Math.sin(angle - ARROW_SPREAD) * ARROW_SIZE,
          };
          const right = {
            x: tip.x - Math.cos(angle + ARROW_SPREAD) * ARROW_SIZE,
            y: tip.y - Math.sin(angle + ARROW_SPREAD) * ARROW_SIZE,
          };

          return (
            <g key={`edge-${edge.from}-${edge.to}`} style={{ pointerEvents: "none" }}>
              <line
                x1={start.x}
                y1={start.y}
                x2={tip.x}
                y2={tip.y}
                stroke={bright ? PALETTE.edgeBright : PALETTE.edge}
                strokeWidth={bright ? 1.6 : 1.2}
              />
              {directed ? (
                <polygon
                  points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`}
                  fill={bright ? PALETTE.edgeBright : PALETTE.edge}
                />
              ) : null}
              {weighted ? (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fontFamily="var(--font-mono), monospace"
                  fill={PALETTE.weight}
                  stroke={PALETTE.canvas}
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {edge.weight}
                </text>
              ) : null}
            </g>
          );
        })}

        {vertices.map((id) => {
          const position = positionOf(id);
          const tone = TONES[toneOf(id)];
          const pending = id === pendingFrom;
          return (
            <g
              key={`vertex-${id}`}
              data-vertex={id}
              style={{ cursor: "grab" }}
            >
              {pending ? (
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={NODE_RADIUS + 5}
                  fill="none"
                  stroke={PALETTE.accentStroke}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              ) : null}
              <circle
                cx={position.x}
                cy={position.y}
                r={NODE_RADIUS}
                fill={tone.fill}
                stroke={tone.stroke}
                strokeWidth={pending ? 2 : 1.2}
              />
              <text
                x={position.x}
                y={position.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontFamily="var(--font-mono), monospace"
                fill={tone.text}
                style={{ pointerEvents: "none" }}
              >
                {id}
              </text>
            </g>
          );
        })}
      </svg>

      {vertices.length === 0 ? <EmptyGraph message={emptyMessage} /> : null}
    </div>
  );
}

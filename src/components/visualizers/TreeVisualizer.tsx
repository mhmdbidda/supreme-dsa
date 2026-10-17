"use client";

import type { TreeSnapshot, TreeStep } from "@/algorithms/trees";

type TreeVisualizerProps = {
  /** Live tree; drawn only while no step is being played back. */
  tree: TreeSnapshot | null;
  /** The snapshot currently displayed by the playback controls. */
  step: TreeStep | null;
  /** Values already visited earlier in this operation (painted dim). */
  visited: ReadonlySet<number>;
  emptyMessage: string;
};

type PlacedNode = { value: number; x: number; y: number; depth: number };
type PlacedEdge = { from: PlacedNode; to: PlacedNode };

/**
 * Automatic layout: x = INORDER RANK × horizontal gap (so every node sits
 * between its own subtree columns — no overlap ever), y = depth × vertical
 * gap. Fits the ~31 nodes of a depth-4 tree in one scrolling canvas.
 */
const NODE_RADIUS = 17;
const H_GAP = 48;
const V_GAP = 66;
const PADDING = 26;
const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;

function layoutTree(root: TreeSnapshot | null): {
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  width: number;
  height: number;
} {
  const nodes: PlacedNode[] = [];
  const edges: PlacedEdge[] = [];
  if (root === null) {
    return { nodes, edges, width: MIN_WIDTH, height: MIN_HEIGHT };
  }

  let rank = 0;
  const place = (node: TreeSnapshot, depth: number, parent: PlacedNode | null): void => {
    const placed: PlacedNode = {
      value: node.value,
      x: 0,
      y: PADDING + NODE_RADIUS + depth * V_GAP,
      depth,
    };
    if (parent !== null) edges.push({ from: parent, to: placed });

    if (node.left !== null) place(node.left, depth + 1, placed);
    // Inorder rank decides x: left subtree gets the columns to the left.
    placed.x = PADDING + NODE_RADIUS + rank * H_GAP;
    rank += 1;
    if (node.right !== null) place(node.right, depth + 1, placed);
    nodes.push(placed);
  };
  place(root, 0, null);

  const width = Math.max(
    MIN_WIDTH,
    2 * (PADDING + NODE_RADIUS) + (nodes.length - 1) * H_GAP,
  );
  const maxDepth = nodes.reduce((deepest, node) => Math.max(deepest, node.depth), 0);
  const height = Math.max(
    MIN_HEIGHT,
    2 * (PADDING + NODE_RADIUS) + maxDepth * V_GAP,
  );
  return { nodes, edges, width, height };
}

/**
 * Colour precedence per node: found (dim green) > highlight (accent) >
 * visited (dim) > default. Edges are always hairlines.
 */
const PALETTE = {
  edge: "rgba(255, 255, 255, 0.14)",
  defaultFill: "#161616",
  defaultStroke: "rgba(255, 255, 255, 0.18)",
  defaultText: "#ededed",
  dimFill: "#101010",
  dimStroke: "rgba(255, 255, 255, 0.07)",
  dimText: "#8a8a8a",
  accentFill: "rgba(242, 181, 68, 0.12)",
  accentStroke: "rgba(242, 181, 68, 0.75)",
  accentText: "#f2b544",
  foundFill: "rgba(85, 128, 95, 0.18)",
  foundStroke: "rgba(85, 128, 95, 0.85)",
  foundText: "#55805f",
} as const;

type Tone = "default" | "dim" | "accent" | "found";

function toneOf(
  value: number,
  highlight: ReadonlySet<number>,
  found: ReadonlySet<number>,
  visited: ReadonlySet<number>,
): Tone {
  if (found.has(value)) return "found";
  if (highlight.has(value)) return "accent";
  if (visited.has(value)) return "dim";
  return "default";
}

/** Empty tree: the designed empty state plus the `root → null` terminator. */
function EmptyTree({ message }: { message: string }) {
  return (
    <div className="m-auto flex max-w-sm flex-col items-center gap-3 text-center">
      <p className="text-sm font-medium tracking-tight text-ink">
        {message.split(" — ")[0]}
      </p>
      <p className="text-[13px] leading-relaxed text-ink-muted">{message}</p>
      <p className="font-mono text-[12px] tracking-tight text-ink-muted" aria-hidden="true">
        root → <span className="text-accent/80">null</span>
      </p>
    </div>
  );
}

/**
 * The tree drawn as SVG: circles for nodes, hairline lines for edges, laid
 * out automatically (x by inorder rank, y by depth). Scrolls horizontally
 * when a wide tree needs more room than the panel has.
 */
export function TreeVisualizer({
  tree,
  step,
  visited,
  emptyMessage,
}: TreeVisualizerProps) {
  const shown = step !== null ? step.tree : tree;

  if (shown === null) {
    return <EmptyTree message={step?.description ?? emptyMessage} />;
  }

  const highlight = new Set(step?.highlight ?? []);
  const found = step?.found === undefined ? new Set<number>() : new Set([step.found]);
  const { nodes, edges, width, height } = layoutTree(shown);

  return (
    <div
      role="img"
      aria-label={step?.description ?? `Binary search tree with ${nodes.length} nodes`}
      className="mx-auto max-w-none"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block max-w-none shrink-0"
      >
        {edges.map((edge, index) => (
          <line
            key={index}
            x1={edge.from.x}
            y1={edge.from.y}
            x2={edge.to.x}
            y2={edge.to.y}
            stroke={PALETTE.edge}
            strokeWidth={1}
          />
        ))}
        {nodes.map((node) => {
          const tone = toneOf(node.value, highlight, found, visited);
          const fill =
            tone === "found"
              ? PALETTE.foundFill
              : tone === "accent"
                ? PALETTE.accentFill
                : tone === "dim"
                  ? PALETTE.dimFill
                  : PALETTE.defaultFill;
          const stroke =
            tone === "found"
              ? PALETTE.foundStroke
              : tone === "accent"
                ? PALETTE.accentStroke
                : tone === "dim"
                  ? PALETTE.dimStroke
                  : PALETTE.defaultStroke;
          const text =
            tone === "found"
              ? PALETTE.foundText
              : tone === "accent"
                ? PALETTE.accentText
                : tone === "dim"
                  ? PALETTE.dimText
                  : PALETTE.defaultText;

          // Shape cues so state never relies on colour alone: the found node
          // gets an extra ring and a bold stroke, the current node a bold
          // stroke, visited nodes a dashed stroke.
          const strokeWidth =
            tone === "found" ? 2.5 : tone === "accent" ? 2 : 1;
          const strokeDasharray = tone === "dim" ? "2 2" : undefined;

          return (
            <g key={`${node.depth}-${node.x}-${node.value}`}>
              {tone === "found" ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS + 4}
                  fill="none"
                  stroke={PALETTE.foundStroke}
                  strokeWidth={1}
                />
              ) : null}
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_RADIUS}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={text}
                fontFamily="var(--font-jetbrains), ui-monospace, monospace"
                fontSize={13}
              >
                {node.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

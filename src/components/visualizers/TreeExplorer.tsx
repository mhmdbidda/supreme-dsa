"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  SAMPLE_TREE,
  VisualBST,
  getTreeMeta,
  type TreeOutcome,
  type TreeStep,
} from "@/algorithms/trees";
import { PlaybackControls } from "@/components/controls/PlaybackControls";
import { TreeVisualizer } from "@/components/visualizers/TreeVisualizer";
import { usePlayback } from "@/hooks/usePlayback";
import { cn, parseSingleNumber } from "@/lib/utils";

const MAX_LOG_ENTRIES = 10;

/** One button in the operation panel. */
type OperationDef = {
  id: string;
  label: string;
  tone: "accent" | "neutral";
  /** Reads the value input and passes it to the engine. */
  needsValue?: boolean;
  /** Makes the button inert while the tree holds nothing. */
  disabledWhenEmpty?: boolean;
  run: (value: number) => TreeOutcome;
};

type LogEntry = {
  id: number;
  label: string;
  summary: string;
  isError: boolean;
};

function callLabel(op: OperationDef, value: number): string {
  if (op.needsValue === true) return `${op.label}(${value})`;
  return `${op.label}()`;
}

/** One-line outcome for the operation log: the error, else the result. */
function summarizeOutcome(outcome: TreeOutcome): string {
  if (outcome.error !== undefined) return outcome.error;
  const { result } = outcome;
  if (typeof result === "boolean") return `Result: ${result}`;
  if (Array.isArray(result)) return `Result: [${result.join(", ")}]`;
  if (typeof result === "number") return `Result: ${result}`;
  return outcome.steps[outcome.steps.length - 1]?.description ?? "Done.";
}

/**
 * Values visited so far in the CURRENT operation, minus whatever the shown
 * step highlights (the accent wins) and whatever it just found (green wins).
 * Computed from the immutable step stream — the engine never mutates it.
 */
function visitedValues(steps: readonly TreeStep[], index: number): Set<number> {
  const visited = new Set<number>();
  for (let i = 0; i <= index; i += 1) {
    const step = steps[i];
    if (step === undefined) continue;
    for (const value of step.visitOrder ?? []) visited.add(value);
    if (i < index) for (const value of step.highlight) visited.add(value);
  }
  const current = steps[index];
  if (current !== undefined) {
    for (const value of current.highlight) visited.delete(value);
    if (current.found !== undefined) visited.delete(current.found);
  }
  return visited;
}

/** The traversal sequence growing under the tree, one chip per visit. */
function VisitOrderStrip({ step }: { step: TreeStep | null }) {
  if (step?.visitOrder === undefined) return null;
  const order = step.visitOrder;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="label">Visit order</p>
        <span className="font-mono text-[10px] tracking-tight text-ink-muted">
          {order.length} visited
        </span>
      </div>
      {order.length === 0 ? (
        <p className="mt-3 font-mono text-[12px] tracking-tight text-ink-muted">
          — empty so far, press play to grow the sequence
        </p>
      ) : (
        <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Visit order so far">
          {order.map((value, index) => (
            <li
              key={`${index}-${value}`}
              className={cn(
                "flex h-7 min-w-8 items-center justify-center rounded-md border px-2 font-mono text-[12px] tracking-tight",
                index === order.length - 1
                  ? "border-accent/70 bg-accent/10 text-accent"
                  : "border-line bg-surface-2 text-ink-muted",
              )}
            >
              {value}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

type LegendItem = { tone: string; label: string };

const LEGEND: LegendItem[] = [
  { tone: "bg-accent", label: "Current node" },
  { tone: "bg-surface-2 border border-line", label: "Visited · dim" },
  { tone: "bg-sorted", label: "Found" },
];

/**
 * Tree Explorer: operation panel + SVG tree + playback + inspector for the
 * hand-rolled BST. The pure engine (`src/algorithms/trees`) generates every
 * step up front; this component applies an operation to the live tree and
 * plays its step stream back through `usePlayback` — the same contract the
 * Sorting Lab and the Data Structures Lab use.
 */
export function TreeExplorer() {
  const meta = getTreeMeta();
  // One persistent instance — never recreated between operations.
  const [tree] = useState(() => new VisualBST());
  // Bumped after every operation so the panels re-read the engine state.
  const [, setTreeVersion] = useState(0);

  const [valueInput, setValueInput] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [steps, setSteps] = useState<TreeStep[]>([]);
  const [lastOutcome, setLastOutcome] = useState<TreeOutcome | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  const playback = usePlayback(steps);
  const step = steps.at(playback.index) ?? null;

  const nodeCount = tree.countNodes();
  const height = tree.measureHeight();
  const liveTree = tree.toSnapshot();

  const visited = useMemo(() => visitedValues(steps, playback.index), [steps, playback.index]);

  const operations: OperationDef[] = [
    { id: "insert", label: "Insert", tone: "accent", needsValue: true, run: (value) => tree.insert(value) },
    { id: "search", label: "Search", tone: "neutral", needsValue: true, run: (value) => tree.search(value) },
    { id: "delete", label: "Delete", tone: "accent", needsValue: true, disabledWhenEmpty: true, run: (value) => tree.deleteValue(value) },
    { id: "inorder", label: "Inorder", tone: "neutral", disabledWhenEmpty: true, run: () => tree.inorder() },
    { id: "preorder", label: "Preorder", tone: "neutral", disabledWhenEmpty: true, run: () => tree.preorder() },
    { id: "postorder", label: "Postorder", tone: "neutral", disabledWhenEmpty: true, run: () => tree.postorder() },
    { id: "clear", label: "Clear", tone: "neutral", disabledWhenEmpty: true, run: () => tree.clear() },
    {
      id: "loadSample",
      label: "Load sample tree",
      tone: "neutral",
      run: () => {
        tree.clear();
        return tree.insertAll(SAMPLE_TREE);
      },
    },
  ];

  const runOperation = (op: OperationDef) => {
    let value = Number.NaN;

    if (op.needsValue === true) {
      const parsed = parseSingleNumber(valueInput);
      if (!parsed.ok) {
        setFieldError(parsed.error);
        setOperationError(null);
        return;
      }
      value = parsed.value;
    }
    setFieldError(null);

    // The engine mutates the live tree and returns an immutable step stream
    // whose last snapshot matches that tree exactly.
    const outcome = op.run(value);
    setSteps(outcome.steps);
    setLastOutcome(outcome);
    setOperationError(outcome.error ?? null);

    logIdRef.current += 1;
    const entry: LogEntry = {
      id: logIdRef.current,
      label: op.id === "loadSample" ? "Load sample" : callLabel(op, value),
      summary: summarizeOutcome(outcome),
      isError: outcome.error !== undefined,
    };
    setLog((previous) => [entry, ...previous].slice(0, MAX_LOG_ENTRIES));
    setTreeVersion((version) => version + 1);
  };

  const inputHintId = "tree-input-hint";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="label">Module 03 · Trees</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink">
            Tree Explorer · Binary Search Tree
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{meta.summary}</p>
        </div>

        <div className="max-w-xs rounded-md border border-line bg-surface px-4 py-3">
          <p className="label">Duplicate policy</p>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
            {meta.duplicatePolicy}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Operation panel */}
          <section className="panel p-5" aria-labelledby="tree-operations-heading">
            <div className="flex items-center justify-between gap-4">
              <h2 id="tree-operations-heading" className="label">
                Operations
              </h2>
              <span className="font-mono text-[11px] tracking-tight text-ink-muted">
                {nodeCount} node{nodeCount === 1 ? "" : "s"} · height {height}
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="tree-value" className="label">
                  Value
                </label>
                <input
                  id="tree-value"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={valueInput}
                  onChange={(event) => {
                    setValueInput(event.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  placeholder="50"
                  aria-invalid={fieldError !== null ? true : undefined}
                  aria-describedby={inputHintId}
                  className="mt-2 w-full rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] tracking-tight text-ink placeholder:text-ink-muted/80"
                />
              </div>
            </div>

            {fieldError !== null ? (
              <p
                id={inputHintId}
                role="alert"
                className="mt-2 font-mono text-[11px] tracking-tight text-accent"
              >
                {fieldError}
              </p>
            ) : (
              <p id={inputHintId} className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                Numbers only, e.g. 50, -3 or 2.5. Duplicate inserts are refused — the tree
                stays unchanged.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {operations.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => runOperation(op)}
                  disabled={op.disabledWhenEmpty === true && nodeCount === 0}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-md border px-4 text-[12px] font-medium tracking-tight transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    op.tone === "accent"
                      ? "border-accent/60 bg-surface-2 text-accent hover:bg-[#1c1c1c]"
                      : "border-line bg-surface text-ink-muted hover:border-white/20 hover:text-ink",
                  )}
                >
                  {op.label}
                </button>
              ))}
            </div>

            {operationError !== null ? (
              <div
                role="alert"
                className="mt-4 flex items-start gap-3 rounded-md border border-accent/40 bg-surface-2 p-4"
              >
                <TriangleAlert
                  size={16}
                  strokeWidth={1.75}
                  className="mt-0.5 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium tracking-tight text-ink">
                    Operation refused
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                    {operationError}
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          {/* Visualization */}
          <section className="panel p-5" aria-labelledby="tree-visualization-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="tree-visualization-heading" className="label">
                Visualization
              </h2>
              <ul className="flex flex-wrap items-center gap-3">
                {LEGEND.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted"
                  >
                    <span className={cn("h-2 w-2 rounded-[2px]", item.tone)} aria-hidden="true" />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <div
              tabIndex={0}
              role="group"
              aria-label="Tree visualization canvas - scroll to navigate wide trees"
              className="mt-4 flex h-[40vh] min-h-[280px] max-h-[520px] items-start overflow-auto rounded-md border border-line bg-[#0d0d0d] p-4 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-1 focus:ring-offset-surface"
            >
              <TreeVisualizer
                tree={liveTree}
                step={step}
                visited={visited}
                emptyMessage={meta.emptyMessage}
              />
            </div>

            <VisitOrderStrip step={step} />
          </section>

          {/* Playback */}
          <section className="panel p-5" aria-labelledby="tree-playback-heading">
            <h2 id="tree-playback-heading" className="label">
              Playback
            </h2>
            <div className="mt-4">
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
        </div>

        {/* Side panel */}
        <aside className="min-w-0 space-y-5" aria-label="Binary search tree inspector">
          <section className="panel p-5" aria-labelledby="tree-stats-heading">
            <h2 id="tree-stats-heading" className="label">
              Tree
            </h2>
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="text-[12px] tracking-tight text-ink-muted">Height</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">{height}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="text-[12px] tracking-tight text-ink-muted">Node count</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">{nodeCount}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="text-[12px] tracking-tight text-ink-muted">Nodes visited</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">
                  {lastOutcome?.counters.nodesVisited ?? 0}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[12px] tracking-tight text-ink-muted">Comparisons</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">
                  {lastOutcome?.counters.comparisons ?? 0}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">{meta.heightNote}</p>
          </section>

          <section className="panel p-5" aria-labelledby="tree-step-heading">
            <h2 id="tree-step-heading" className="label">
              Current step
            </h2>
            <p
              className="mt-3 min-h-[4.5rem] text-[13px] leading-relaxed text-ink"
              aria-live="polite"
              aria-atomic="true"
            >
              {step?.description ??
                "Run an operation to generate its step stream, then play it back here."}
            </p>
            <p className="mt-2 font-mono text-[11px] tracking-tight text-ink-muted">
              {steps.length === 0
                ? "No steps yet"
                : `Step ${playback.index + 1} / ${steps.length}`}
            </p>
          </section>

          <section className="panel p-5" aria-labelledby="tree-log-heading">
            <div className="flex items-center justify-between gap-4">
              <h2 id="tree-log-heading" className="label">
                Operation log
              </h2>
              <span className="font-mono text-[10px] tracking-tight text-ink-muted">
                last {MAX_LOG_ENTRIES}
              </span>
            </div>
            {log.length === 0 ? (
              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                No operations yet — run one and it lands here, newest first.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {log.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-md border border-line bg-surface-2 px-3 py-2"
                  >
                    <p
                      className={cn(
                        "font-mono text-[11px] tracking-tight",
                        entry.isError ? "text-accent" : "text-ink",
                      )}
                    >
                      {entry.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                      {entry.summary}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel p-5" aria-labelledby="tree-complexity-heading">
            <h2 id="tree-complexity-heading" className="label">
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
              <p className="label">Worst case · skewed trees</p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">{meta.skewNote}</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

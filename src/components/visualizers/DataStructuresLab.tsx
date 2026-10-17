"use client";

import { TriangleAlert } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import {
  VisualLinkedList,
  VisualQueue,
  VisualStack,
  getStructureMeta,
  type DSOutcome,
  type DSSnapshot,
  type DSStructureId,
  type DSStructureMeta,
} from "@/algorithms/data-structures";
import { PlaybackControls } from "@/components/controls/PlaybackControls";
import { SegmentedControl } from "@/components/controls/SegmentedControl";
import { LinkedListVisualizer } from "@/components/visualizers/LinkedListVisualizer";
import { QueueVisualizer } from "@/components/visualizers/QueueVisualizer";
import { StackVisualizer } from "@/components/visualizers/StackVisualizer";
import { usePlayback } from "@/hooks/usePlayback";
import { cn, parseSingleNumber } from "@/lib/utils";

type TabId = DSStructureId;

const TABS: ReadonlyArray<{ value: TabId; label: string }> = [
  { value: "stack", label: "Stack" },
  { value: "queue", label: "Queue" },
  { value: "linked-list", label: "Linked List" },
];

const MAX_LOG_ENTRIES = 10;

/** One button in a structure's operation panel. */
type OperationDef = {
  id: string;
  label: string;
  tone: "accent" | "neutral";
  /** Reads the value input and passes it as the first argument. */
  needsValue?: boolean;
  /** Reads the position input and passes it as the second argument. */
  needsPosition?: boolean;
  /** Makes the button inert while the structure holds nothing. */
  disabledWhenEmpty?: boolean;
  run: (value: number, position: number) => DSOutcome;
};

type LogEntry = {
  id: number;
  label: string;
  summary: string;
  isError: boolean;
};

function callLabel(op: OperationDef, value: number, position: number): string {
  if (op.needsValue === true && op.needsPosition === true) {
    return `${op.label}(${value}, ${position})`;
  }
  if (op.needsValue === true) return `${op.label}(${value})`;
  if (op.needsPosition === true) return `${op.label}(${position})`;
  return `${op.label}()`;
}

/** One-line outcome for the operation log: the error, else the result. */
function summarizeOutcome(outcome: DSOutcome): string {
  if (outcome.error !== undefined) return outcome.error;
  const { result } = outcome;
  if (typeof result === "boolean") return `Result: ${result}`;
  if (typeof result === "number") return `Result: ${result}`;
  if (Array.isArray(result)) return `Result: [${result.join(", ")}]`;
  return outcome.steps[outcome.steps.length - 1]?.description ?? "Done.";
}

type StructurePanelProps = {
  meta: DSStructureMeta;
  /** The engine's live state, read fresh after every operation. */
  items: number[];
  operations: OperationDef[];
  /** Called after every operation so the lab re-reads the engine state. */
  onMutated: () => void;
  /** Renders the structure's visualizer for the currently displayed step. */
  renderVisualization: (step: DSSnapshot | null) => ReactNode;
};

/**
 * Operation panel + visualization + playback + inspector for ONE structure.
 * The pure engine (`src/algorithms/data-structures`) generates every step up
 * front; this component only applies an operation to the live structure and
 * plays its step stream back through `usePlayback` — the same contract the
 * Sorting Lab uses.
 */
function StructurePanel({
  meta,
  items,
  operations,
  onMutated,
  renderVisualization,
}: StructurePanelProps) {
  const [valueInput, setValueInput] = useState("");
  const [positionInput, setPositionInput] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [steps, setSteps] = useState<DSSnapshot[]>([]);
  const [lastOutcome, setLastOutcome] = useState<DSOutcome | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  const playback = usePlayback(steps);
  const step = steps.at(playback.index) ?? null;

  const needsValue = operations.some((op) => op.needsValue === true);
  const needsPosition = operations.some((op) => op.needsPosition === true);
  const hasInputs = needsValue || needsPosition;

  const runOperation = (op: OperationDef) => {
    let value = Number.NaN;
    let position = Number.NaN;

    if (op.needsValue === true) {
      const parsed = parseSingleNumber(valueInput);
      if (!parsed.ok) {
        setFieldError(parsed.error);
        setOperationError(null);
        return;
      }
      value = parsed.value;
    }
    if (op.needsPosition === true) {
      const trimmed = positionInput.trim();
      if (!/^\d+$/.test(trimmed)) {
        setFieldError(
          "Position must be a whole number, 0 or greater — 0 is the head.",
        );
        setOperationError(null);
        return;
      }
      position = Number(trimmed);
    }
    setFieldError(null);

    // The engine mutates the live structure and returns an immutable step
    // stream whose last snapshot matches that structure exactly.
    const outcome = op.run(value, position);
    setSteps(outcome.steps);
    setLastOutcome(outcome);
    setOperationError(outcome.error ?? null);

    logIdRef.current += 1;
    const entry: LogEntry = {
      id: logIdRef.current,
      label: callLabel(op, value, position),
      summary: summarizeOutcome(outcome),
      isError: outcome.error !== undefined,
    };
    setLog((previous) => [entry, ...previous].slice(0, MAX_LOG_ENTRIES));
    onMutated();
  };

  const inputHintId = `${meta.id}-input-hint`;

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        {/* Operation panel */}
        <section className="panel p-5" aria-labelledby={`${meta.id}-operations-heading`}>
          <div className="flex items-center justify-between gap-4">
            <h2 id={`${meta.id}-operations-heading`} className="label">
              Operations
            </h2>
            <span className="font-mono text-[11px] tracking-tight text-ink-muted">
              {items.length} item{items.length === 1 ? "" : "s"}
            </span>
          </div>

          {hasInputs ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {needsValue ? (
                <div>
                  <label htmlFor={`${meta.id}-value`} className="label">
                    Value
                  </label>
                  <input
                    id={`${meta.id}-value`}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={valueInput}
                    onChange={(event) => {
                      setValueInput(event.target.value);
                      if (fieldError) setFieldError(null);
                    }}
                    placeholder="7"
                    aria-invalid={fieldError !== null ? true : undefined}
                    aria-describedby={inputHintId}
                    className="mt-2 w-full rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] tracking-tight text-ink placeholder:text-ink-muted/80"
                  />
                </div>
              ) : null}
              {needsPosition ? (
                <div>
                  <label htmlFor={`${meta.id}-position`} className="label">
                    Position
                  </label>
                  <input
                    id={`${meta.id}-position`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={positionInput}
                    onChange={(event) => {
                      setPositionInput(event.target.value);
                      if (fieldError) setFieldError(null);
                    }}
                    placeholder="0"
                    aria-invalid={fieldError !== null ? true : undefined}
                    aria-describedby={inputHintId}
                    className="mt-2 w-full rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] tracking-tight text-ink placeholder:text-ink-muted/80"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {fieldError !== null ? (
            <p
              id={inputHintId}
              role="alert"
              className="mt-2 font-mono text-[11px] tracking-tight text-accent"
            >
              {fieldError}
            </p>
          ) : hasInputs ? (
            <p id={inputHintId} className="mt-2 text-[11px] leading-relaxed text-ink-muted">
              {needsPosition
                ? "Whole positions only — 0 is the head; insertAt also accepts the current size to append at the tail."
                : "Numbers only, e.g. 7, -3 or 2.5."}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {operations.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => runOperation(op)}
                disabled={op.disabledWhenEmpty === true && items.length === 0}
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
        <section className="panel p-5" aria-labelledby={`${meta.id}-visualization-heading`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={`${meta.id}-visualization-heading`} className="label">
              Visualization
            </h2>
            <ul className="flex flex-wrap items-center gap-3">
              <li className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                <span className="h-2 w-2 rounded-[2px] bg-accent" aria-hidden="true" />
                Highlighted node
              </li>
              <li className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                <span className="h-2 w-2 rounded-[2px] bg-compare" aria-hidden="true" />
                Pointer labels
              </li>
            </ul>
          </div>

          <div
            tabIndex={0}
            role="group"
            aria-label="Data structure visualization - scroll horizontally to see full structure"
            className="mt-4 flex h-[40vh] min-h-[260px] max-h-[480px] items-center overflow-x-auto rounded-md border border-line bg-[#0d0d0d] p-4 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-1 focus:ring-offset-surface"
          >
            {renderVisualization(step)}
          </div>
        </section>

        {/* Playback */}
        <section className="panel p-5" aria-labelledby={`${meta.id}-playback-heading`}>
          <h2 id={`${meta.id}-playback-heading`} className="label">
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
      <aside className="min-w-0 space-y-5" aria-label={`${meta.name} inspector`}>
        <section className="panel p-5" aria-labelledby={`${meta.id}-stats-heading`}>
          <h2 id={`${meta.id}-stats-heading`} className="label">
            Structure
          </h2>
          <dl className="mt-4 space-y-3">
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
              <dt className="text-[12px] tracking-tight text-ink-muted">Size</dt>
              <dd className="font-mono text-lg tracking-tight text-ink">{items.length}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
              <dt className="text-[12px] tracking-tight text-ink-muted">Nodes visited</dt>
              <dd className="font-mono text-lg tracking-tight text-ink">
                {lastOutcome?.counters.nodesVisited ?? 0}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[12px] tracking-tight text-ink-muted">Pointer changes</dt>
              <dd className="font-mono text-lg tracking-tight text-ink">
                {lastOutcome?.counters.pointerChanges ?? 0}
              </dd>
            </div>
          </dl>
        </section>

        <section className="panel p-5" aria-labelledby={`${meta.id}-step-heading`}>
          <h2 id={`${meta.id}-step-heading`} className="label">
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

        <section className="panel p-5" aria-labelledby={`${meta.id}-log-heading`}>
          <div className="flex items-center justify-between gap-4">
            <h2 id={`${meta.id}-log-heading`} className="label">
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

        <section className="panel p-5" aria-labelledby={`${meta.id}-complexity-heading`}>
          <h2 id={`${meta.id}-complexity-heading`} className="label">
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
        </section>
      </aside>
    </div>
  );
}

/**
 * Data Structures Playground: a tab switcher over a Stack, a Queue and a
 * Singly Linked List. Each structure is a hand-rolled engine class that
 * records every operation as an immutable step stream; the panel plays the
 * stream back with the shared playback controls, and the structure itself
 * persists in the lab between operations (and between tab switches).
 */
export function DataStructuresLab() {
  const [tab, setTab] = useState<TabId>("stack");
  // One persistent instance per structure — never recreated on tab switches.
  const [stack] = useState(() => new VisualStack());
  const [queue] = useState(() => new VisualQueue());
  const [linkedList] = useState(() => new VisualLinkedList());
  // Bumped after every operation so the panels re-read the engine state.
  const [, setStructureVersion] = useState(0);

  const meta = getStructureMeta(tab);

  const stackOperations: OperationDef[] = [
    { id: "push", label: "Push", tone: "accent", needsValue: true, run: (value) => stack.push(value) },
    { id: "pop", label: "Pop", tone: "accent", run: () => stack.pop() },
    { id: "peek", label: "Peek", tone: "neutral", run: () => stack.peek() },
    { id: "isEmpty", label: "Is empty", tone: "neutral", run: () => stack.isEmpty() },
    { id: "size", label: "Size", tone: "neutral", run: () => stack.size() },
    { id: "clear", label: "Clear", tone: "neutral", disabledWhenEmpty: true, run: () => stack.clear() },
  ];

  const queueOperations: OperationDef[] = [
    { id: "enqueue", label: "Enqueue", tone: "accent", needsValue: true, run: (value) => queue.enqueue(value) },
    { id: "dequeue", label: "Dequeue", tone: "accent", run: () => queue.dequeue() },
    { id: "front", label: "Front", tone: "neutral", run: () => queue.front() },
    { id: "isEmpty", label: "Is empty", tone: "neutral", run: () => queue.isEmpty() },
    { id: "size", label: "Size", tone: "neutral", run: () => queue.size() },
    { id: "clear", label: "Clear", tone: "neutral", disabledWhenEmpty: true, run: () => queue.clear() },
  ];

  const linkedListOperations: OperationDef[] = [
    { id: "insertHead", label: "Insert head", tone: "accent", needsValue: true, run: (value) => linkedList.insertHead(value) },
    { id: "insertTail", label: "Insert tail", tone: "accent", needsValue: true, run: (value) => linkedList.insertTail(value) },
    { id: "insertAt", label: "Insert at", tone: "accent", needsValue: true, needsPosition: true, run: (value, position) => linkedList.insertAt(position, value) },
    { id: "deleteAt", label: "Delete at", tone: "accent", needsPosition: true, run: (_value, position) => linkedList.deleteAt(position) },
    { id: "deleteValue", label: "Delete value", tone: "accent", needsValue: true, run: (value) => linkedList.deleteValue(value) },
    { id: "search", label: "Search", tone: "neutral", needsValue: true, run: (value) => linkedList.search(value) },
    { id: "traverse", label: "Traverse", tone: "neutral", run: () => linkedList.traverse() },
    { id: "reverse", label: "Reverse", tone: "accent", run: () => linkedList.reverse() },
    { id: "size", label: "Size", tone: "neutral", run: () => linkedList.size() },
    { id: "clear", label: "Clear", tone: "neutral", disabledWhenEmpty: true, run: () => linkedList.clear() },
  ];

  const mutate = () => setStructureVersion((version) => version + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="label">Module 02 · Data Structures</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink">
            Data Structures Playground
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{meta.summary}</p>
        </div>

        <div className="space-y-2">
          <p className="label">Structure</p>
          <SegmentedControl
            label="Structure"
            value={tab}
            options={TABS}
            onChange={setTab}
          />
        </div>
      </div>

      {tab === "stack" ? (
        <StructurePanel
          key="stack"
          meta={meta}
          items={stack.toArray()}
          operations={stackOperations}
          onMutated={mutate}
          renderVisualization={(playbackStep) => (
            <StackVisualizer
              items={stack.toArray()}
              step={playbackStep}
              emptyMessage={meta.emptyMessage}
            />
          )}
        />
      ) : tab === "queue" ? (
        <StructurePanel
          key="queue"
          meta={meta}
          items={queue.toArray()}
          operations={queueOperations}
          onMutated={mutate}
          renderVisualization={(playbackStep) => (
            <QueueVisualizer
              items={queue.toArray()}
              step={playbackStep}
              emptyMessage={meta.emptyMessage}
            />
          )}
        />
      ) : (
        <StructurePanel
          key="linked-list"
          meta={meta}
          items={linkedList.toArray()}
          operations={linkedListOperations}
          onMutated={mutate}
          renderVisualization={(playbackStep) => (
            <LinkedListVisualizer
              items={linkedList.toArray()}
              step={playbackStep}
              emptyMessage={meta.emptyMessage}
            />
          )}
        />
      )}
    </div>
  );
}

"use client";

import { CircleCheck, Inbox, ListTree, Sigma, TriangleAlert } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import {
  buildCallTree,
  countCallsByParams,
  factorial,
  fibonacci,
  getRecursionFunction,
  bstInorder,
  recursionFunctions,
  recursiveBinarySearch,
  summarizeRecursionProgress,
  type CallTreeNode,
  type RecursionFunctionId,
  type RecursionOutcome,
  type RecursionStep,
} from "@/algorithms/recursion";
import { SAMPLE_TREE, VisualBST } from "@/algorithms/trees";
import { PlaybackControls } from "@/components/controls/PlaybackControls";
import { SegmentedControl } from "@/components/controls/SegmentedControl";
import { usePlayback } from "@/hooks/usePlayback";
import { cn, parseNumberList, parseSingleNumber } from "@/lib/utils";

const EMPTY_STEPS: RecursionStep[] = [];

/**
 * One node of the reconstructed call tree, drawn as an indented tree that
 * grows as the steps play back. Repeated subproblems (the same frame
 * entered more than once — naive Fibonacci's signature) are badged.
 */
function CallTreeNodeView({
  node,
  nodes,
  repeated,
}: {
  node: CallTreeNode;
  nodes: CallTreeNode[];
  repeated: Map<string, number>;
}) {
  const repeatCount = repeated.get(node.params) ?? 1;
  return (
    <li>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-md border px-3 py-1.5",
          node.status === "open"
            ? "border-accent/60 bg-accent/10"
            : "border-line bg-surface-2",
        )}
      >
        <span className="font-mono text-[12px] tracking-tight text-ink">
          {node.fn}({node.params})
        </span>
        {node.status === "returned" ? (
          <span className="font-mono text-[12px] tracking-tight text-sorted">
            = {String(node.returnValue)}
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
            on stack
          </span>
        )}
        {node.isBaseCase ? (
          <span className="rounded-full border border-sorted/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-sorted">
            base case
          </span>
        ) : null}
        {repeatCount > 1 ? (
          <span
            title={`${node.params} was entered ${repeatCount} times — a repeated subproblem.`}
            className="rounded-full border border-accent/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-accent"
          >
            ×{repeatCount} repeat
          </span>
        ) : null}
      </div>
      {node.children.length > 0 ? (
        <ul className="mt-1.5 space-y-1.5 border-l border-line pl-4">
          {node.children.map((childId) => (
            <CallTreeNodeView
              key={childId}
              node={nodes[childId]}
              nodes={nodes}
              repeated={repeated}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Recursion Visualizer: pure recursive functions emit every call and
 * return up front (`src/algorithms/recursion`), and this component plays
 * them back one index at a time through `usePlayback`. The step stream
 * carries a deep copy of the full call stack, so the stack panel and the
 * Fibonacci call tree are simple projections of the current step.
 */
export function RecursionVisualizer() {
  const [functionId, setFunctionId] = useState<RecursionFunctionId>("factorial");
  const [outcome, setOutcome] = useState<RecursionOutcome | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const [nInput, setNInput] = useState("5");
  const [arrayInput, setArrayInput] = useState("1, 3, 5, 7, 9, 11, 13, 15");
  const [targetInput, setTargetInput] = useState("7");
  const [treeInput, setTreeInput] = useState(SAMPLE_TREE.join(", "));

  const meta = getRecursionFunction(functionId);

  const steps = useMemo(() => outcome?.steps ?? EMPTY_STEPS, [outcome]);
  const playback = usePlayback(steps);
  const step = playback.index >= 0 ? (steps.at(playback.index) ?? null) : null;

  const progress = useMemo(
    () => summarizeRecursionProgress(steps, playback.index),
    [steps, playback.index],
  );

  // Params fully determine base-case-ness, so stacked frames can be
  // labelled from the call steps of the whole run.
  const baseCaseParams = useMemo(
    () =>
      new Set(
        steps
          .filter((entry) => entry.event === "call" && entry.isBaseCase === true)
          .map((entry) => entry.params),
      ),
    [steps],
  );

  // The call tree grows with playback: only the steps shown so far are
  // folded into nodes, so new frames appear as they are entered.
  const isFibonacci = functionId === "fibonacci";
  const shownSteps = useMemo(
    () => (isFibonacci ? steps.slice(0, playback.index + 1) : EMPTY_STEPS),
    [isFibonacci, steps, playback.index],
  );
  const treeNodes = useMemo(() => buildCallTree(shownSteps), [shownSteps]);
  const repeatedParams = useMemo(() => countCallsByParams(shownSteps), [shownSteps]);

  const refused = outcome?.error !== undefined;
  const hasRun = outcome !== null && !refused;
  const complete = hasRun && steps.length > 0 && playback.atEnd;
  const stack = step?.stack ?? [];
  const popped =
    step?.event === "return"
      ? { fn: step.fn, params: step.params, returnValue: step.returnValue }
      : null;

  const resetRun = (nextId: RecursionFunctionId) => {
    setFunctionId(nextId);
    setOutcome(null);
    setInputError(null);
  };

  const handleNumberSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseSingleNumber(nInput);
    if (!parsed.ok) {
      setInputError(parsed.error);
      setOutcome(null);
      return;
    }
    setInputError(null);
    setOutcome(functionId === "factorial" ? factorial(parsed.value) : fibonacci(parsed.value));
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedArray = parseNumberList(arrayInput, 30);
    if (!parsedArray.ok) {
      setInputError(parsedArray.error);
      setOutcome(null);
      return;
    }
    const parsedTarget = parseSingleNumber(targetInput);
    if (!parsedTarget.ok) {
      setInputError(parsedTarget.error);
      setOutcome(null);
      return;
    }
    setInputError(null);
    setOutcome(recursiveBinarySearch(parsedArray.values, parsedTarget.value));
  };

  const handleTreeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseNumberList(treeInput, 30);
    if (!parsed.ok) {
      setInputError(parsed.error);
      setOutcome(null);
      return;
    }
    // Reuse the Tree Explorer's engine to build the snapshot: same BST,
    // same duplicate policy, same plain serializable node type.
    const bst = new VisualBST();
    const inserted = bst.insertAll(parsed.values);
    if (inserted.error !== undefined) {
      setInputError(inserted.error);
      setOutcome(null);
      return;
    }
    setInputError(null);
    setOutcome(bstInorder(bst.toSnapshot()));
  };

  const inputForm = (() => {
    if (functionId === "factorial" || functionId === "fibonacci") {
      return (
        <form onSubmit={handleNumberSubmit}>
          <label htmlFor="recursion-n" className="label">
            {meta.inputLabel}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="recursion-n"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={nInput}
              onChange={(event) => {
                setNInput(event.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder={meta.inputPlaceholder}
              aria-invalid={inputError ? true : undefined}
              aria-describedby={inputError ? "recursion-input-error" : "recursion-input-hint"}
              className="min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] tracking-tight text-ink placeholder:text-ink-muted/60"
            />
            <button
              type="submit"
              className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-accent/60 bg-surface-2 px-4 text-[12px] font-medium tracking-tight text-accent transition-colors hover:bg-[#1c1c1c]"
            >
              <Sigma size={14} strokeWidth={1.75} aria-hidden="true" />
              Run
            </button>
          </div>
          <p id="recursion-input-hint" className="mt-2 text-[11px] leading-relaxed text-ink-muted">
            {meta.inputHint} {meta.limitNote} Out-of-range input is refused without running.
          </p>
        </form>
      );
    }

    if (functionId === "binarySearch") {
      return (
        <form onSubmit={handleSearchSubmit}>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div>
              <label htmlFor="recursion-array" className="label">
                Sorted array
              </label>
              <input
                id="recursion-array"
                type="text"
                autoComplete="off"
                value={arrayInput}
                onChange={(event) => {
                  setArrayInput(event.target.value);
                  if (inputError) setInputError(null);
                }}
                placeholder={meta.inputPlaceholder}
                aria-invalid={inputError ? true : undefined}
                aria-describedby={inputError ? "recursion-input-error" : "recursion-input-hint"}
                className="mt-2 min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] tracking-tight text-ink placeholder:text-ink-muted/60"
              />
            </div>
            <div>
              <label htmlFor="recursion-target" className="label">
                Target
              </label>
              <input
                id="recursion-target"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={targetInput}
                onChange={(event) => {
                  setTargetInput(event.target.value);
                  if (inputError) setInputError(null);
                }}
                placeholder="7"
                className="mt-2 min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] tracking-tight text-ink placeholder:text-ink-muted/60"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="flex h-9 items-center gap-2 rounded-md border border-accent/60 bg-surface-2 px-4 text-[12px] font-medium tracking-tight text-accent transition-colors hover:bg-[#1c1c1c]"
            >
              Run
            </button>
            <p id="recursion-input-hint" className="text-[11px] leading-relaxed text-ink-muted">
              {meta.inputHint} {meta.limitNote}
            </p>
          </div>
        </form>
      );
    }

    return (
      <form onSubmit={handleTreeSubmit}>
        <label htmlFor="recursion-tree" className="label">
          {meta.inputLabel}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="recursion-tree"
            type="text"
            autoComplete="off"
            value={treeInput}
            onChange={(event) => {
              setTreeInput(event.target.value);
              if (inputError) setInputError(null);
            }}
            placeholder={meta.inputPlaceholder}
            aria-invalid={inputError ? true : undefined}
            aria-describedby={inputError ? "recursion-input-error" : "recursion-input-hint"}
            className="min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] tracking-tight text-ink placeholder:text-ink-muted/60"
          />
          <button
            type="submit"
            className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-accent/60 bg-surface-2 px-4 text-[12px] font-medium tracking-tight text-accent transition-colors hover:bg-[#1c1c1c]"
          >
            Build &amp; traverse
          </button>
        </div>
        <p id="recursion-input-hint" className="mt-2 text-[11px] leading-relaxed text-ink-muted">
          {meta.inputHint} {meta.limitNote} Values are inserted into the Tree Explorer&apos;s BST
          (duplicates refused), then traversed recursively.
        </p>
      </form>
    );
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="label">Module 05 · Complexity — Recursion Visualizer</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink">
            Recursion Visualizer
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{meta.summary}</p>
        </div>

        <div className="space-y-2">
          <p className="label">Function</p>
          <SegmentedControl
            label="Recursive function"
            value={functionId}
            options={recursionFunctions.map((entry) => ({
              value: entry.id,
              label: entry.name.replace(" (naive)", "").replace(" (recursive)", ""),
            }))}
            onChange={resetRun}
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Input */}
          <section className="panel p-5" aria-labelledby="recursion-input-heading">
            <div className="flex items-center justify-between gap-4">
              <h2 id="recursion-input-heading" className="label">
                Input · {meta.inputLabel}
              </h2>
              <span className="font-mono text-[11px] tracking-tight text-ink-muted">
                {meta.limitNote}
              </span>
            </div>
            <div className="mt-4">{inputForm}</div>
            {inputError ? (
              <p
                id="recursion-input-error"
                role="alert"
                className="mt-3 font-mono text-[11px] tracking-tight text-accent"
              >
                {inputError}
              </p>
            ) : null}
          </section>

          {/* Refusal notice */}
          {refused ? (
            <div
              role="status"
              className="panel flex items-start gap-3 border-accent/40 p-5"
            >
              <TriangleAlert
                size={16}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0 text-accent"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium tracking-tight text-ink">
                  Input refused — nothing ran
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                  {outcome?.error}
                </p>
              </div>
            </div>
          ) : null}

          {/* Call stack */}
          <section className="panel p-5" aria-labelledby="call-stack-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="call-stack-heading" className="label">
                Call stack
              </h2>
              <span className="font-mono text-[11px] tracking-tight text-ink-muted">
                {stack.length} frame{stack.length === 1 ? "" : "s"} · top first
              </span>
            </div>

            {steps.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-md border border-line bg-surface-2/60 px-6 py-10 text-center">
                <Inbox size={22} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />
                <p className="text-sm font-medium tracking-tight text-ink">No recursion yet</p>
                <p className="max-w-md text-[13px] leading-relaxed text-ink-muted">
                  {refused
                    ? "Fix the input above and run again — a refused input records no steps."
                    : "Set the input above and press Run to record every call and return, then step through them one frame at a time."}
                </p>
              </div>
            ) : (
              <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
                <ol className="space-y-2" aria-label="Call stack frames, top first">
                  {[...stack].reverse().map((frame, reverseIndex) => {
                    const isTop = reverseIndex === 0;
                    return (
                      <li
                        key={`${stack.length - reverseIndex}-${frame.params}`}
                        className={cn(
                          "flex flex-wrap items-center gap-2 rounded-md border px-3 py-2",
                          isTop
                            ? "border-accent/60 bg-accent/10"
                            : "border-line bg-surface-2",
                        )}
                      >
                        <span className="font-mono text-[10px] tracking-[0.12em] text-ink-muted">
                          #{stack.length - reverseIndex}
                        </span>
                        <span className="font-mono text-[12px] tracking-tight text-ink">
                          {frame.fn}({frame.params})
                        </span>
                        {isTop ? (
                          <span className="rounded-full border border-accent/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-accent">
                            top
                          </span>
                        ) : null}
                        {baseCaseParams.has(frame.params) ? (
                          <span className="rounded-full border border-sorted/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-sorted">
                            base case
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>

                {popped ? (
                  <div
                    role="status"
                    className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-sorted/50 bg-surface-2 px-3 py-2"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-sorted">
                      popped
                    </span>
                    <span className="font-mono text-[12px] tracking-tight text-ink">
                      {popped.fn}({popped.params}) →{" "}
                      <span className="text-sorted">{String(popped.returnValue)}</span>
                    </span>
                  </div>
                ) : null}

                {stack.length === 0 && !popped ? (
                  <p className="mt-3 font-mono text-[12px] tracking-tight text-ink-muted">
                    Stack empty — the recursion has fully unwound.
                  </p>
                ) : null}
              </div>
            )}
          </section>

          {/* Call tree — Fibonacci only, the repeated subproblems are the point */}
          {isFibonacci ? (
            <section className="panel p-5" aria-labelledby="call-tree-heading">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="call-tree-heading" className="label">
                  <span className="inline-flex items-center gap-1.5">
                    <ListTree size={12} strokeWidth={1.75} aria-hidden="true" />
                    Call tree
                  </span>
                </h2>
                <span className="font-mono text-[11px] tracking-tight text-ink-muted">
                  {treeNodes.length} node{treeNodes.length === 1 ? "" : "s"} so far
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                One node per call, growing with playback. Badged repeats are the same subproblem
                solved again — the reason naive Fibonacci is exponential.
              </p>
              {treeNodes.length === 0 ? (
                <p className="mt-4 font-mono text-[12px] tracking-tight text-ink-muted">
                  — press Play to grow the tree
                </p>
              ) : (
                <ul className="mt-4 max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
                  {treeNodes
                    .filter((node) => node.depth === 1)
                    .map((node) => (
                      <CallTreeNodeView
                        key={node.id}
                        node={node}
                        nodes={treeNodes}
                        repeated={repeatedParams}
                      />
                    ))}
                </ul>
              )}
            </section>
          ) : null}

          {/* Playback */}
          <section className="panel p-5" aria-labelledby="recursion-playback-heading">
            <h2 id="recursion-playback-heading" className="label">
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
        <aside className="min-w-0 space-y-5" aria-label="Recursion inspector">
          <section className="panel p-5" aria-labelledby="recursion-counters-heading">
            <h2 id="recursion-counters-heading" className="label">
              Live counters
            </h2>
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="text-[12px] tracking-tight text-ink-muted">Calls made</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">
                  {progress.calls}
                  {hasRun ? (
                    <span className="text-sm text-ink-muted"> / {outcome.counters.calls}</span>
                  ) : null}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="text-[12px] tracking-tight text-ink-muted">Max depth</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">
                  {progress.maxDepth}
                  {hasRun ? (
                    <span className="text-sm text-ink-muted"> / {outcome.counters.maxDepth}</span>
                  ) : null}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[12px] tracking-tight text-ink-muted">Step</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">
                  {steps.length === 0 ? 0 : playback.index + 1}
                  <span className="text-sm text-ink-muted"> / {steps.length}</span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="panel p-5" aria-labelledby="recursion-step-heading">
            <h2 id="recursion-step-heading" className="label">
              Current step
            </h2>
            <p className="mt-3 min-h-[4.5rem] text-[13px] leading-relaxed text-ink">
              {step?.description ??
                (refused
                  ? "Nothing ran — the input was refused before any call was made."
                  : "No steps yet — run the function to record its call and return stream.")}
            </p>
            {step ? (
              <p className="mt-2 font-mono text-[11px] tracking-tight text-ink-muted">
                {step.event === "call" ? "call" : "return"} · depth {step.depth}
                {step.event === "call" && step.isBaseCase === true ? " · base case" : ""}
              </p>
            ) : null}
          </section>

          {complete ? (
            <div
              role="status"
              className="panel flex items-start gap-3 border-sorted/50 p-5"
            >
              <CircleCheck
                size={16}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0 text-sorted"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium tracking-tight text-ink">Recursion unwound</p>
                <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-ink-muted">
                  Result:{" "}
                  {Array.isArray(outcome.result)
                    ? `[${outcome.result.join(", ")}]`
                    : String(outcome.result)}{" "}
                  · {outcome.counters.calls} calls · max depth {outcome.counters.maxDepth}
                </p>
              </div>
            </div>
          ) : null}

          <section className="panel p-5" aria-labelledby="recursion-complexity-heading">
            <h2 id="recursion-complexity-heading" className="label">
              Complexity
            </h2>
            <p className="mt-3 text-[13px] font-medium tracking-tight text-ink">{meta.name}</p>
            <dl className="mt-3 space-y-2">
              {[
                { term: "Time", value: meta.complexity.time },
                { term: "Space", value: meta.complexity.space },
                { term: "Guard", value: meta.limitNote },
              ].map((row) => (
                <div
                  key={row.term}
                  className="flex items-baseline justify-between gap-4 border-b border-line pb-2 last:border-none last:pb-0"
                >
                  <dt className="text-[12px] tracking-tight text-ink-muted">{row.term}</dt>
                  <dd className="text-right font-mono text-[12px] tracking-tight text-ink">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

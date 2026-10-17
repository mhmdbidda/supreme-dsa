"use client";

import { CircleCheck, Inbox, Shuffle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import {
  getSortingAlgorithm,
  sortingAlgorithms,
  type SortAlgorithmId,
  type SortStep,
} from "@/algorithms/sorting";
import { PlaybackControls } from "@/components/controls/PlaybackControls";
import { RangeControl } from "@/components/controls/RangeControl";
import { SegmentedControl } from "@/components/controls/SegmentedControl";
import { BarChart } from "@/components/visualizers/BarChart";
import { usePlayback } from "@/hooks/usePlayback";
import { summarizeProgress } from "@/lib/progress";
import {
  MAX_ARRAY_SIZE,
  MIN_ARRAY_SIZE,
  clamp,
  parseNumberList,
  randomArray,
} from "@/lib/utils";

const EMPTY_STEPS: SortStep[] = [];

const LEGEND = [
  { tone: "bg-accent", label: "Active" },
  { tone: "bg-compare", label: "Compared" },
  { tone: "bg-sorted", label: "Sorted" },
] as const;

/**
 * Sorting lab: generates every step first (pure algorithms), then plays them
 * back with a single current-step index driven by `usePlayback`.
 */
export function SortingLab() {
  const [array, setArray] = useState<number[]>([]);
  const [size, setSize] = useState(12);
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [algorithmId, setAlgorithmId] = useState<SortAlgorithmId>("bubble");

  const algorithm = getSortingAlgorithm(algorithmId);
  const outcome = useMemo(
    () => (array.length > 0 ? algorithm.run(array) : null),
    [array, algorithm],
  );
  const steps = useMemo(() => outcome?.steps ?? EMPTY_STEPS, [outcome]);
  const playback = usePlayback(steps);
  const step = steps[playback.index] ?? null;
  const progress = useMemo(
    () => summarizeProgress(steps, playback.index),
    [steps, playback.index],
  );

  const isEmpty = array.length === 0;
  const isComplete = steps.length > 0 && playback.atEnd;

  const generateRandom = (nextSize: number) => {
    setArray(randomArray(nextSize));
    setCustomInput("");
    setError(null);
  };

  const handleSizeChange = (value: number) => {
    const nextSize = clamp(Math.round(value), MIN_ARRAY_SIZE, MAX_ARRAY_SIZE);
    setSize(nextSize);
    generateRandom(nextSize);
  };

  const handleApplyCustom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseNumberList(customInput);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setArray(parsed.values);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="label">Module 01 · Sorting &amp; Searching</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink">
            Sorting Lab
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {algorithm.summary}
          </p>
        </div>
        <div className="space-y-2">
          <p className="label">Algorithm</p>
          <SegmentedControl
            label="Sorting algorithm"
            value={algorithmId}
            options={sortingAlgorithms.map(({ id, name }) => ({
              value: id,
              label: name,
            }))}
            onChange={(nextId) => {
              setAlgorithmId(nextId);
              setError(null);
            }}
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Array input */}
          <section className="panel p-5" aria-labelledby="array-heading">
            <div className="flex items-center justify-between gap-4">
              <h2 id="array-heading" className="label">
                Array input
              </h2>
              <span className="font-mono text-[11px] tracking-tight text-ink-muted">
                {array.length} item{array.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-4 grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-8">
              <button
                type="button"
                onClick={() => generateRandom(size)}
                className="flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-surface-2 px-4 text-[12px] font-medium tracking-tight text-ink transition-colors hover:border-white/20 hover:bg-[#1c1c1c]"
              >
                <Shuffle size={14} strokeWidth={1.75} aria-hidden="true" />
                Generate random
              </button>

              <RangeControl
                id="array-size"
                label="Size"
                value={size}
                min={MIN_ARRAY_SIZE}
                max={MAX_ARRAY_SIZE}
                valueText={`${size} items`}
                hint="Dragging the slider regenerates a random array of this size."
                onChange={handleSizeChange}
              />
            </div>

            <form onSubmit={handleApplyCustom} className="mt-5">
              <label htmlFor="custom-values" className="label">
                Custom values
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="custom-values"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={customInput}
                  onChange={(event) => {
                    setCustomInput(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="12, 4, -9, 7, 3"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "custom-error" : "custom-hint"}
                  className="min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] tracking-tight text-ink placeholder:text-ink-muted/60"
                />
                <button
                  type="submit"
                  className="h-9 shrink-0 rounded-md border border-line bg-surface-2 px-4 text-[12px] font-medium tracking-tight text-ink transition-colors hover:border-white/20 hover:bg-[#1c1c1c]"
                >
                  Apply
                </button>
              </div>
              {error ? (
                <p id="custom-error" role="alert" className="mt-2 font-mono text-[11px] tracking-tight text-accent">
                  {error}
                </p>
              ) : (
                <p id="custom-hint" className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                  Numbers only, separated by commas. Duplicates and negatives are fine, maximum{" "}
                  {MAX_ARRAY_SIZE} items.
                </p>
              )}
            </form>
          </section>

          {/* Visualization */}
          <section className="panel p-5" aria-labelledby="visualization-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="visualization-heading" className="label">
                Visualization
              </h2>
              <ul className="flex items-center gap-3">
                {LEGEND.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted"
                  >
                    <span className={`h-2 w-2 rounded-[2px] ${item.tone}`} aria-hidden="true" />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex h-[46vh] min-h-[300px] max-h-[520px] rounded-md border border-line bg-[#0d0d0d] p-4">
              {isEmpty ? (
                <div className="m-auto flex max-w-sm flex-col items-center gap-3 text-center">
                  <Inbox size={22} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />
                  <p className="text-sm font-medium tracking-tight text-ink">
                    No array loaded
                  </p>
                  <p className="text-[13px] leading-relaxed text-ink-muted">
                    Generate a random array or paste your own values to build the
                    step stream. Nothing runs until you press Play.
                  </p>
                  <button
                    type="button"
                    onClick={() => generateRandom(size)}
                    className="mt-1 flex h-9 items-center gap-2 rounded-md border border-accent/50 px-4 text-[12px] font-medium tracking-tight text-accent transition-colors hover:bg-surface-2"
                  >
                    <Shuffle size={14} strokeWidth={1.75} aria-hidden="true" />
                    Generate random
                  </button>
                </div>
              ) : (
                <BarChart
                  array={step?.array ?? array}
                  activeIndices={step?.activeIndices}
                  comparedIndices={step?.comparedIndices}
                  sortedIndices={step?.sortedIndices}
                  ariaLabel={step?.description ?? "Sorting visualization"}
                />
              )}
            </div>

            {isComplete ? (
              <div className="mt-4 flex items-start gap-3 rounded-md border border-sorted/50 bg-surface-2 p-4">
                <CircleCheck size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-sorted" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium tracking-tight text-ink">
                    Sorting complete
                  </p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-ink-muted">
                    {progress.comparisons} comparisons · {progress.swaps} swaps/moves ·{" "}
                    {steps.length} steps · {algorithm.name}
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          {/* Playback controls */}
          <section className="panel p-5" aria-labelledby="playback-heading">
            <h2 id="playback-heading" className="label">
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
        <aside className="min-w-0 space-y-5" aria-label="Step inspector">
          <section className="panel p-5" aria-labelledby="counters-heading">
            <h2 id="counters-heading" className="label">
              Live counters
            </h2>
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="text-[12px] tracking-tight text-ink-muted">Comparisons</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">{progress.comparisons}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="text-[12px] tracking-tight text-ink-muted">Swaps / moves</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">{progress.swaps}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[12px] tracking-tight text-ink-muted">Step</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">
                  {progress.stepNumber}
                  <span className="text-sm text-ink-muted"> / {progress.totalSteps}</span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="panel p-5" aria-labelledby="description-heading">
            <h2 id="description-heading" className="label">
              Current step
            </h2>
            <p className="mt-3 min-h-[4.5rem] text-[13px] leading-relaxed text-ink">
              {step?.description ??
                "No steps yet — load an array to generate the step stream."}
            </p>
          </section>

          <section className="panel p-5" aria-labelledby="complexity-heading">
            <h2 id="complexity-heading" className="label">
              Complexity
            </h2>
            <p className="mt-3 text-[13px] font-medium tracking-tight text-ink">
              {algorithm.name}
            </p>
            <dl className="mt-3 space-y-2">
              {[
                { term: "Best", value: algorithm.complexity.best },
                { term: "Average", value: algorithm.complexity.average },
                { term: "Worst", value: algorithm.complexity.worst },
                { term: "Extra space", value: algorithm.complexity.space },
              ].map((row) => (
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
    </div>
  );
}

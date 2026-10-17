"use client";

import { CircleCheck, Inbox, Search, Shuffle, TriangleAlert } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import {
  getSearchAlgorithm,
  searchingAlgorithms,
  type SearchAlgorithmId,
  type SearchStep,
} from "@/algorithms/searching";
import {
  getSortingAlgorithm,
  mergeSort,
  sortingAlgorithms,
  type SortAlgorithmId,
  type SortStep,
} from "@/algorithms/sorting";
import { PlaybackControls } from "@/components/controls/PlaybackControls";
import { RangeControl } from "@/components/controls/RangeControl";
import { SegmentedControl } from "@/components/controls/SegmentedControl";
import { BarChart } from "@/components/visualizers/BarChart";
import { usePlayback } from "@/hooks/usePlayback";
import { summarizeProgress, summarizeSearchProgress } from "@/lib/progress";
import {
  MAX_ARRAY_SIZE,
  MIN_ARRAY_SIZE,
  clamp,
  parseNumberList,
  parseSingleNumber,
  randomArray,
} from "@/lib/utils";

type LabMode = "sort" | "search";

const DEFAULT_ARRAY_SIZE = 20;
const EMPTY_SORT_STEPS: SortStep[] = [];
const EMPTY_SEARCH_STEPS: SearchStep[] = [];

/** Kept aside whenever a copy is pre-sorted for binary search. */
type PreSortReport = {
  name: string;
  comparisons: number;
  moves: number;
};

const LEGEND: Record<LabMode, ReadonlyArray<{ tone: string; label: string }>> = {
  sort: [
    { tone: "bg-accent", label: "Active" },
    { tone: "bg-compare", label: "Compared" },
    { tone: "bg-sorted", label: "Sorted" },
  ],
  search: [
    { tone: "bg-accent", label: "Active" },
    { tone: "bg-compare", label: "Compared" },
    { tone: "bg-sorted", label: "Found" },
    { tone: "bg-bar opacity-30", label: "Out of window" },
  ],
};

/**
 * Sorting + searching lab. Pure algorithms generate every step up front
 * (`src/algorithms/...`), and this component only plays them back through a
 * single current-step index from `usePlayback`.
 */
export function SortingLab() {
  const [array, setArray] = useState<number[]>(() =>
    randomArray(DEFAULT_ARRAY_SIZE),
  );
  const [size, setSize] = useState(DEFAULT_ARRAY_SIZE);
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<LabMode>("sort");
  const [algorithmId, setAlgorithmId] = useState<SortAlgorithmId>("bubble");
  const [searchAlgorithmId, setSearchAlgorithmId] =
    useState<SearchAlgorithmId>("linear");
  const [targetInput, setTargetInput] = useState("");
  const [targetError, setTargetError] = useState<string | null>(null);
  const [committedTarget, setCommittedTarget] = useState<number | null>(null);
  const [preSort, setPreSort] = useState<PreSortReport | null>(null);

  const sortAlgorithm = getSortingAlgorithm(algorithmId);
  const searchAlgorithm = getSearchAlgorithm(searchAlgorithmId);

  const sortOutcome = useMemo(
    () => (mode === "sort" && array.length > 0 ? sortAlgorithm.run(array) : null),
    [mode, array, sortAlgorithm],
  );
  const searchOutcome = useMemo(
    () =>
      mode === "search" && array.length > 0 && committedTarget !== null
        ? searchAlgorithm.run(array, committedTarget)
        : null,
    [mode, array, committedTarget, searchAlgorithm],
  );

  const sortSteps = useMemo(() => sortOutcome?.steps ?? EMPTY_SORT_STEPS, [sortOutcome]);
  const searchSteps = useMemo(
    () => searchOutcome?.steps ?? EMPTY_SEARCH_STEPS,
    [searchOutcome],
  );
  const steps = mode === "sort" ? sortSteps : searchSteps;

  const playback = usePlayback(steps);

  const sortStep = mode === "sort" ? (sortSteps.at(playback.index) ?? null) : null;
  const searchStep =
    mode === "search" ? (searchSteps.at(playback.index) ?? null) : null;

  const sortProgress = useMemo(
    () => summarizeProgress(sortSteps, playback.index),
    [sortSteps, playback.index],
  );
  const searchProgress = useMemo(
    () => summarizeSearchProgress(searchSteps, playback.index),
    [searchSteps, playback.index],
  );
  const progress = mode === "sort" ? sortProgress : searchProgress;

  const isEmpty = array.length === 0;
  const waitingForTarget = mode === "search" && searchOutcome === null && !isEmpty;
  const refused = searchOutcome?.refusedUnsortedInput === true;
  const sortComplete = mode === "sort" && sortSteps.length > 0 && playback.atEnd;
  const searchComplete =
    mode === "search" &&
    searchOutcome !== null &&
    !refused &&
    searchSteps.length > 0 &&
    playback.atEnd;
  const searchFound = searchComplete && searchOutcome?.result !== null;

  const searchFoundIndex = searchStep?.foundIndex;
  const searchLow = searchStep?.low;
  const searchHigh = searchStep?.high;

  const chart =
    mode === "sort"
      ? {
          array: sortStep?.array ?? array,
          activeIndices: sortStep?.activeIndices,
          comparedIndices: sortStep?.comparedIndices,
          sortedIndices: sortStep?.sortedIndices,
          dimRange: null,
          ariaLabel: `Bar chart of ${array.length} values, step ${playback.index + 1} of ${sortSteps.length}`,
        }
      : {
          array: searchStep?.array ?? array,
          activeIndices: searchStep?.activeIndices,
          comparedIndices: searchStep?.comparedIndices,
          sortedIndices:
            searchFoundIndex !== undefined ? [searchFoundIndex] : [],
          dimRange:
            searchLow !== undefined && searchHigh !== undefined
              ? { low: searchLow, high: searchHigh }
              : null,
          ariaLabel: `Bar chart of ${array.length} values, step ${playback.index + 1} of ${searchSteps.length}`,
        };

  const stepDescription =
    sortStep?.description ??
    searchStep?.description ??
    (isEmpty || mode === "sort"
      ? "No steps yet — load an array to generate the step stream."
      : "No target yet — enter a target value to generate the step stream.");

  const generateRandom = (nextSize: number) => {
    setArray(randomArray(nextSize));
    setCustomInput("");
    setError(null);
    setPreSort(null);
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
      // Invalid input empties the lab: inline error + the designed empty state.
      setError(parsed.error);
      setArray([]);
      setPreSort(null);
      return;
    }
    setArray(parsed.values);
    setError(null);
    setPreSort(null);
  };

  const handleClear = () => {
    setArray([]);
    setCustomInput("");
    setError(null);
    setPreSort(null);
  };

  const handleApplyTarget = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseSingleNumber(targetInput);
    if (!parsed.ok) {
      setTargetError(parsed.error);
      return;
    }
    setCommittedTarget(parsed.value);
    setTargetError(null);
  };

  const handleSortCopyAndSearch = () => {
    // Sorting a *copy*: the algorithms never mutate their input, and the
    // result replaces the array in state. Its counters are reported apart
    // from the search counters.
    const outcome = mergeSort(array);
    setArray(outcome.result);
    setCustomInput("");
    setError(null);
    setPreSort({
      name: "Merge Sort",
      comparisons: outcome.counters.comparisons,
      moves: outcome.counters.swaps,
    });
  };

  const handleModeChange = (nextMode: LabMode) => {
    setMode(nextMode);
    setPreSort(null);
  };

  const algorithmLabel = mode === "sort" ? "Sorting algorithm" : "Searching algorithm";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="label">Module 01 · Sorting &amp; Searching</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink">
            {mode === "sort" ? "Sorting Lab" : "Searching Lab"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {mode === "sort" ? sortAlgorithm.summary : searchAlgorithm.summary}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="space-y-2">
            <p className="label">Mode</p>
            <SegmentedControl
              label="Lab mode"
              value={mode}
              options={[
                { value: "sort", label: "Sort" },
                { value: "search", label: "Search" },
              ]}
              onChange={handleModeChange}
            />
          </div>

          <div className="space-y-2">
            <p className="label">{algorithmLabel}</p>
            {mode === "sort" ? (
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
            ) : (
              <SegmentedControl
                label="Searching algorithm"
                value={searchAlgorithmId}
                options={searchingAlgorithms.map(({ id, name }) => ({
                  value: id,
                  label: name,
                }))}
                onChange={setSearchAlgorithmId}
              />
            )}
          </div>
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => generateRandom(size)}
                  className="flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface-2 px-4 text-[12px] font-medium tracking-tight text-ink transition-colors hover:border-white/20 hover:bg-[#1c1c1c]"
                >
                  <Shuffle size={14} strokeWidth={1.75} aria-hidden="true" />
                  Generate random
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isEmpty}
                  title="Reset the array to nothing"
                  className="flex h-10 items-center justify-center rounded-md border border-line bg-surface px-4 text-[12px] font-medium tracking-tight text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear
                </button>
              </div>

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
                  className="min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] tracking-tight text-ink placeholder:text-ink-muted/80"
                />
                <button
                  type="submit"
                  className="h-10 shrink-0 rounded-md border border-line bg-surface-2 px-4 text-[12px] font-medium tracking-tight text-ink transition-colors hover:border-white/20 hover:bg-[#1c1c1c]"
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

          {/* Search target (search mode only) */}
          {mode === "search" ? (
            <section className="panel p-5" aria-labelledby="target-heading">
              <div className="flex items-center justify-between gap-4">
                <h2 id="target-heading" className="label">
                  Search target
                </h2>
                {committedTarget !== null ? (
                  <span className="font-mono text-[11px] tracking-tight text-ink-muted">
                    Target: <span className="text-ink">{committedTarget}</span>
                  </span>
                ) : null}
              </div>

              <form onSubmit={handleApplyTarget} className="mt-4">
                <label htmlFor="target-value" className="label">
                  Value to find
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="target-value"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={targetInput}
                    onChange={(event) => {
                      setTargetInput(event.target.value);
                      if (targetError) setTargetError(null);
                    }}
                    placeholder="7"
                    aria-invalid={targetError ? true : undefined}
                    aria-describedby={targetError ? "target-error" : "target-hint"}
                    className="min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] tracking-tight text-ink placeholder:text-ink-muted/80"
                  />
                  <button
                    type="submit"
                    className="flex h-10 shrink-0 items-center gap-2 rounded-md border border-accent/60 bg-surface-2 px-4 text-[12px] font-medium tracking-tight text-accent transition-colors hover:bg-[#1c1c1c]"
                  >
                    <Search size={14} strokeWidth={1.75} aria-hidden="true" />
                    Search
                  </button>
                </div>
                {targetError ? (
                  <p id="target-error" role="alert" className="mt-2 font-mono text-[11px] tracking-tight text-accent">
                    {targetError}
                  </p>
                ) : (
                  <p id="target-hint" className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                    A single number, e.g. 7 or -3. The search re-runs as soon as you press Search.
                  </p>
                )}
              </form>

              {refused ? (
                <div
                  role="status"
                  className="mt-4 flex flex-wrap items-start gap-4 rounded-md border border-accent/40 bg-surface-2 p-4"
                >
                  <TriangleAlert
                    size={16}
                    strokeWidth={1.75}
                    className="mt-0.5 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium tracking-tight text-ink">
                      Sorted input required
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                      {searchAlgorithm.name} refuses to search an unsorted array, so
                      nothing was probed and no comparisons were counted. Sorting a copy
                      is reported separately from the search counters.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSortCopyAndSearch}
                    className="flex h-10 shrink-0 items-center gap-2 rounded-md border border-accent/60 px-4 text-[12px] font-medium tracking-tight text-accent transition-colors hover:bg-[#1c1c1c]"
                  >
                    Sort a copy and search
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Visualization */}
          <section className="panel p-5" aria-labelledby="visualization-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="visualization-heading" className="label">
                Visualization
              </h2>
              <ul className="flex flex-wrap items-center gap-3">
                {LEGEND[mode].map((item) => (
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
                    className="mt-1 flex h-10 items-center gap-2 rounded-md border border-accent/50 px-4 text-[12px] font-medium tracking-tight text-accent transition-colors hover:bg-surface-2"
                  >
                    <Shuffle size={14} strokeWidth={1.75} aria-hidden="true" />
                    Generate random
                  </button>
                </div>
              ) : waitingForTarget ? (
                <div className="m-auto flex max-w-sm flex-col items-center gap-3 text-center">
                  <Search size={22} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />
                  <p className="text-sm font-medium tracking-tight text-ink">
                    No target yet
                  </p>
                  <p className="text-[13px] leading-relaxed text-ink-muted">
                    Enter a target value above and press Search to generate the
                    step stream.
                  </p>
                </div>
              ) : (
                <BarChart
                  array={chart.array}
                  activeIndices={chart.activeIndices}
                  comparedIndices={chart.comparedIndices}
                  sortedIndices={chart.sortedIndices}
                  dimRange={chart.dimRange}
                  ariaLabel={chart.ariaLabel}
                />
              )}
            </div>

            {sortComplete ? (
              <div className="mt-4 flex items-start gap-3 rounded-md border border-sorted/50 bg-surface-2 p-4">
                <CircleCheck size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-sorted" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium tracking-tight text-ink">
                    Sorting complete
                  </p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-ink-muted">
                    {progress.comparisons} comparisons · {progress.swaps} swaps/moves ·{" "}
                    {sortSteps.length} steps · {sortAlgorithm.name}
                  </p>
                </div>
              </div>
            ) : null}

            {searchComplete ? (
              searchFound ? (
                <div className="mt-4 flex items-start gap-3 rounded-md border border-sorted/50 bg-surface-2 p-4">
                  <CircleCheck size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-sorted" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium tracking-tight text-ink">
                      Target found
                    </p>
                    <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-ink-muted">
                      {committedTarget} is at index {searchOutcome?.result} ·{" "}
                      {progress.comparisons} comparisons · {searchSteps.length} steps ·{" "}
                      {searchAlgorithm.name}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-start gap-3 rounded-md border border-line bg-surface-2 p-4">
                  <Search size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium tracking-tight text-ink">
                      Target not found
                    </p>
                    <p className="mt-1 font-mono text-[11px] leading-relaxed tracking-tight text-ink-muted">
                      {committedTarget} is not in the array · {progress.comparisons}{" "}
                      comparisons · {searchSteps.length} steps · {searchAlgorithm.name}
                    </p>
                  </div>
                </div>
              )
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
              {mode === "sort" ? (
                <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                  <dt className="text-[12px] tracking-tight text-ink-muted">Swaps / moves</dt>
                  <dd className="font-mono text-lg tracking-tight text-ink">{progress.swaps}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[12px] tracking-tight text-ink-muted">Step</dt>
                <dd className="font-mono text-lg tracking-tight text-ink">
                  {progress.stepNumber}
                  <span className="text-sm text-ink-muted"> / {progress.totalSteps}</span>
                </dd>
              </div>
            </dl>
          </section>

          {mode === "search" && preSort ? (
            <section className="panel p-5" aria-labelledby="presort-heading">
              <h2 id="presort-heading" className="label">
                Pre-sort · reported separately
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                Sorted a copy with {preSort.name} before searching.
              </p>
              <p className="mt-2 font-mono text-[12px] tracking-tight text-ink">
                {preSort.comparisons} comparisons · {preSort.moves} moves
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                Not counted in the search counters above.
              </p>
            </section>
          ) : null}

          <section className="panel p-5" aria-labelledby="description-heading">
            <h2 id="description-heading" className="label">
              Current step
            </h2>
            <p
              className="mt-3 min-h-[4.5rem] text-[13px] leading-relaxed text-ink"
              aria-live="polite"
              aria-atomic="true"
            >
              {stepDescription}
            </p>
          </section>

          <section className="panel p-5" aria-labelledby="complexity-heading">
            <h2 id="complexity-heading" className="label">
              Complexity
            </h2>
            <p className="mt-3 text-[13px] font-medium tracking-tight text-ink">
              {mode === "sort" ? sortAlgorithm.name : searchAlgorithm.name}
            </p>
            <dl className="mt-3 space-y-2">
              {(mode === "sort"
                ? [
                    { term: "Best", value: sortAlgorithm.complexity.best },
                    { term: "Average", value: sortAlgorithm.complexity.average },
                    { term: "Worst", value: sortAlgorithm.complexity.worst },
                    { term: "Extra space", value: sortAlgorithm.complexity.space },
                  ]
                : [
                    { term: "Best", value: searchAlgorithm.complexity.best },
                    { term: "Average", value: searchAlgorithm.complexity.average },
                    { term: "Worst", value: searchAlgorithm.complexity.worst },
                    { term: "Extra space", value: searchAlgorithm.complexity.space },
                  ]
              ).map((row) => (
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

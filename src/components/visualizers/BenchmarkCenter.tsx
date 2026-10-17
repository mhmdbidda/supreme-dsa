"use client";

import { Download, Play, Square, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { searchingAlgorithms } from "@/algorithms/searching";
import { sortingAlgorithms } from "@/algorithms/sorting";
import { RecentExperiments } from "@/components/RecentExperiments";
import { RangeControl } from "@/components/controls/RangeControl";
import { SegmentedControl } from "@/components/controls/SegmentedControl";
import { useRecentBenchmarkRuns } from "@/hooks/useRecentBenchmarkRuns";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  BENCHMARK_ALGORITHMS,
  BENCHMARK_NOTE,
  INPUT_TYPES,
  MAX_BENCHMARK_SIZE,
  MAX_TRIALS,
  MIN_TRIALS,
  PRESET_SIZES,
  createRun,
  loadRecentRuns,
  resultsToCsv,
  runBenchmark,
  runToJson,
  validateBenchmarkConfig,
  type BenchmarkAlgorithmId,
  type BenchmarkConfig,
  type BenchmarkInputType,
  type BenchmarkRow,
  type BenchmarkRun,
} from "@/lib/benchmark";
import { cn } from "@/lib/utils";

const EMPTY_ROWS: BenchmarkRow[] = [];

const ALGORITHM_COLORS: Record<BenchmarkAlgorithmId, string> = {
  bubble: "#f2b544", // accent
  merge: "#55805f", // sorted green
  linear: "#d4d4d4",
  binary: "#8a8a8a",
};

/** The measured runtime/comparisons of one algorithm across the sizes. */
type ChartPoint = Record<string, number>;

function ResultsChart({
  title,
  caption,
  data,
  seriesNames,
  logScale,
  sizeRange,
}: {
  title: string;
  caption: string;
  data: ChartPoint[];
  seriesNames: string[];
  logScale: boolean;
  sizeRange?: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const algorithmsText = seriesNames.length > 0 ? seriesNames.join(", ") : "no algorithms selected";
  const sizeText = sizeRange ?? (data.length > 0 ? `${data[0].size} to ${data[data.length - 1].size}` : "");
  const ariaLabel = `${title}. ${caption} Plotted for algorithms: ${algorithmsText}. Size range: ${sizeText}. Scale: ${logScale ? "logarithmic" : "linear"}.`;
  return (
    <div className="panel p-5" role="img" aria-label={ariaLabel} tabIndex={0}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="label">{title}</h3>
        <span className="font-mono text-[11px] tracking-tight text-ink-muted">
          {logScale ? "log scale" : "linear scale"}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{caption}</p>
      <div className="mt-4 h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="size"
              stroke="#8a8a8a"
              tick={{ fill: "#8a8a8a", fontSize: 11, fontFamily: "monospace" }}
              tickLine={false}
            />
            <YAxis
              scale={logScale ? "log" : "linear"}
              domain={["auto", "auto"]}
              stroke="#8a8a8a"
              tick={{ fill: "#8a8a8a", fontSize: 11, fontFamily: "monospace" }}
              tickLine={false}
              width={64}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#161616",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                color: "#ededed",
                fontSize: 12,
              }}
              labelStyle={{ color: "#8a8a8a", fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "#8a8a8a" }} />
            {seriesNames.map((name) => {
              const algorithm = BENCHMARK_ALGORITHMS.find((entry) => entry.name === name);
              return (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={algorithm ? ALGORITHM_COLORS[algorithm.id] : "#8a8a8a"}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={!prefersReducedMotion}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Benchmark Center: configure algorithms, sizes, input type, trials and a
 * seed; the run streams through `runBenchmark` (one timed run at a time,
 * yielding to the browser between runs) with progress and a Cancel
 * button. Results land in a table, two charts, CSV/JSON exports and the
 * saved "Recent experiments" history.
 */
export function BenchmarkCenter() {
  const [algorithms, setAlgorithms] = useState<BenchmarkAlgorithmId[]>(
    BENCHMARK_ALGORITHMS.map((entry) => entry.id),
  );
  const [sizes, setSizes] = useState<number[]>([100, 500]);
  const [inputType, setInputType] = useState<BenchmarkInputType>("random");
  const [trials, setTrials] = useState(3);
  const [seedText, setSeedText] = useState("42");
  const [configError, setConfigError] = useState<string | null>(null);

  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [results, setResults] = useState<BenchmarkRow[]>(EMPTY_ROWS);
  const [runConfig, setRunConfig] = useState<BenchmarkConfig | null>(null);
  const [currentRun, setCurrentRun] = useState<BenchmarkRun | null>(null);
  const [wasCancelled, setWasCancelled] = useState(false);
  const [logScale, setLogScale] = useState(false);

  const cancelRef = useRef(false);
  const reopenRef = useRef(false);
  const { runs, remember, forget } = useRecentBenchmarkRuns();

  // Reopening a saved run (from the dashboard's Recent experiments list,
  // which links to /complexity?run=<id>) restores config AND results. The
  // query string is read after hydration so the page stays static, and the
  // run itself comes from localStorage (also read post-hydration).
  useEffect(() => {
    if (reopenRef.current) return;
    const reopenId = new URLSearchParams(window.location.search).get("run");
    if (reopenId === null) return;
    const match = loadRecentRuns().find((run) => run.id === reopenId);
    if (match === undefined) return;
    reopenRef.current = true;
    reopenRun(match);
  }, []);

  const reopenRun = (run: BenchmarkRun) => {
    setAlgorithms(run.config.algorithms);
    setSizes(run.config.sizes);
    setInputType(run.config.inputType);
    setTrials(run.config.trials);
    setSeedText(String(run.config.seed));
    setConfigError(null);
    setRunConfig(run.config);
    setResults(run.results);
    setCurrentRun(run);
    setWasCancelled(false);
  };

  const totalRuns =
    algorithms.length * sizes.length * Math.min(Math.max(trials, MIN_TRIALS), MAX_TRIALS);

  const handleRun = async () => {
    if (progress !== null) return;

    const seed = seedText.trim() === "" ? Number.NaN : Number(seedText);
    const validated = validateBenchmarkConfig({
      algorithms,
      sizes,
      inputType,
      trials,
      seed,
    });
    if (!validated.ok) {
      setConfigError(validated.error);
      return;
    }

    setConfigError(null);
    cancelRef.current = false;
    setResults(EMPTY_ROWS);
    setCurrentRun(null);
    setWasCancelled(false);
    setRunConfig(validated.config);
    setProgress({
      completed: 0,
      total:
        validated.config.algorithms.length * validated.config.sizes.length * validated.config.trials,
    });

    let collected: BenchmarkRow[] = [];
    let completedRuns = 0;
    let totalRunsForRun = 0;

    try {
      for await (const update of runBenchmark(validated.config, {
        isCancelled: () => cancelRef.current,
      })) {
        collected = update.results;
        completedRuns = update.completed;
        totalRunsForRun = update.total;
        setProgress({ completed: update.completed, total: update.total });
      }
    } finally {
      setProgress(null);
    }

    setResults(collected);
    const finished = totalRunsForRun > 0 && completedRuns === totalRunsForRun;
    setWasCancelled(!finished && collected.length > 0);
    if (finished && collected.length > 0) {
      const run = createRun(validated.config, collected);
      setCurrentRun(run);
      remember(run);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const toggleAlgorithm = (id: BenchmarkAlgorithmId) => {
    setAlgorithms((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  };

  const toggleSize = (size: number) => {
    setSizes((current) =>
      current.includes(size) ? current.filter((entry) => entry !== size) : [...current, size],
    );
  };

  // The export always reflects what is on screen: the finished run, or a
  // reconstructed "partial" run when the benchmark was cancelled early.
  const exportRun: BenchmarkRun | null =
    currentRun ??
    (runConfig !== null && results.length > 0
      ? {
          id: "partial-run",
          createdAt: new Date().toISOString(),
          config: runConfig,
          results,
        }
      : null);

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (exportRun === null) return;
    downloadFile(`benchmark-${exportRun.id}.csv`, resultsToCsv(exportRun), "text/csv");
  };

  const handleExportJson = () => {
    if (exportRun === null) return;
    downloadFile(`benchmark-${exportRun.id}.json`, runToJson(exportRun), "application/json");
  };

  // Chart series: one point per size, one named value per algorithm.
  const chartData = useMemo<ChartPoint[]>(() => {
    if (runConfig === null || results.length === 0) return [];
    return runConfig.sizes.map((size) => {
      const point: ChartPoint = { size };
      for (const row of results) {
        if (row.size === size) point[row.name] = row.medianMs;
      }
      return point;
    });
  }, [results, runConfig]);

  const comparisonData = useMemo<ChartPoint[]>(() => {
    if (runConfig === null || results.length === 0) return [];
    return runConfig.sizes.map((size) => {
      const point: ChartPoint = { size };
      for (const row of results) {
        if (row.size === size) point[row.name] = row.comparisons;
      }
      return point;
    });
  }, [results, runConfig]);

  const seriesNames = useMemo(
    () =>
      BENCHMARK_ALGORITHMS.filter((entry) => algorithms.includes(entry.id)).map(
        (entry) => entry.name,
      ),
    [algorithms],
  );

  const theoreticalReference = [
    ...sortingAlgorithms.map((entry) => ({ name: entry.name, complexity: entry.complexity })),
    ...searchingAlgorithms.map((entry) => ({ name: entry.name, complexity: entry.complexity })),
  ];

  const chipClass = (selected: boolean) =>
    cn(
      "inline-flex min-h-10 items-center justify-center rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
      selected
        ? "border-accent/60 bg-surface-2 text-accent"
        : "border-line bg-surface text-ink-muted hover:text-ink",
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="label">Module 05 · Complexity — Benchmark Center</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink">
            Benchmark Center
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Measure the lab&apos;s own sorting and searching algorithms on identical seeded inputs —
            median of several trials, fast mode only, nothing rendered inside the timed section.
          </p>
        </div>
        <span className="rounded-full border border-line bg-surface-2 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
          {totalRuns} timed runs per experiment
        </span>
      </div>

      {/* The honesty note — deliberately above the fold of the results. */}
      <div
        role="note"
        className="panel flex items-start gap-3 border-accent/40 p-5"
      >
        <TriangleAlert
          size={16}
          strokeWidth={1.75}
          className="mt-0.5 shrink-0 text-accent"
          aria-hidden="true"
        />
        <p className="text-[13px] leading-relaxed text-ink">{BENCHMARK_NOTE}</p>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Configuration */}
          <section className="panel p-5" aria-labelledby="benchmark-config-heading">
            <div className="flex items-center justify-between gap-4">
              <h2 id="benchmark-config-heading" className="label">
                Configuration
              </h2>
              <span className="font-mono text-[11px] tracking-tight text-ink-muted">
                {algorithms.length} algorithm{algorithms.length === 1 ? "" : "s"} ·{" "}
                {sizes.length} size{sizes.length === 1 ? "" : "s"} · {trials} trials
              </span>
            </div>

            <div className="mt-4 space-y-5">
              <div>
                <p className="label">Algorithms</p>
                <div role="group" aria-label="Algorithms" className="mt-2 flex flex-wrap gap-1">
                  {BENCHMARK_ALGORITHMS.map((entry) => {
                    const selected = algorithms.includes(entry.id);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleAlgorithm(entry.id)}
                        className={chipClass(selected)}
                      >
                        {entry.name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                  Searches run on the same values, pre-sorted outside the timed section, looking
                  for an absent target — the worst case for both.
                </p>
              </div>

              <div>
                <p className="label">Input sizes</p>
                <div role="group" aria-label="Input sizes" className="mt-2 flex flex-wrap gap-1">
                  {PRESET_SIZES.map((size) => {
                    const selected = sizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleSize(size)}
                        className={chipClass(selected)}
                      >
                        n = {size}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                  Preset sizes; anything up to {MAX_BENCHMARK_SIZE} is accepted by the engine.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="label">Input type</p>
                  <SegmentedControl
                    label="Input type"
                    value={inputType}
                    options={INPUT_TYPES.map((entry) => ({ value: entry.id, label: entry.name }))}
                    onChange={setInputType}
                  />
                  <p className="text-[11px] leading-relaxed text-ink-muted">
                    {INPUT_TYPES.find((entry) => entry.id === inputType)?.note}
                  </p>
                </div>

                <div className="space-y-4">
                  <RangeControl
                    id="benchmark-trials"
                    label="Trials (median reported)"
                    value={trials}
                    min={MIN_TRIALS}
                    max={MAX_TRIALS}
                    valueText={`${trials} trials`}
                    hint="Each trial gets a fresh copy of the same seeded input."
                    onChange={(value) => setTrials(Math.round(value))}
                  />
                  <div>
                    <label htmlFor="benchmark-seed" className="label">
                      Seed
                    </label>
                    <input
                      id="benchmark-seed"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={seedText}
                      onChange={(event) => {
                        setSeedText(event.target.value);
                        if (configError) setConfigError(null);
                      }}
                      aria-invalid={configError ? true : undefined}
                      aria-describedby={configError ? "benchmark-config-error" : undefined}
                      className="mt-2 w-full rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] tracking-tight text-ink"
                    />
                  </div>
                </div>
              </div>
            </div>

            {configError ? (
              <p
                id="benchmark-config-error"
                role="alert"
                className="mt-4 font-mono text-[11px] tracking-tight text-accent"
              >
                {configError}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {progress === null ? (
                <button
                  type="button"
                  onClick={handleRun}
                  className="flex h-10 items-center gap-2 rounded-md border border-accent/60 bg-surface-2 px-4 text-[12px] font-medium tracking-tight text-accent transition-colors hover:bg-[#1c1c1c]"
                >
                  <Play size={14} strokeWidth={1.75} aria-hidden="true" />
                  Run benchmark
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-4 text-[12px] font-medium tracking-tight text-ink-muted transition-colors hover:text-ink"
                >
                  <Square size={13} strokeWidth={1.75} aria-hidden="true" />
                  Cancel
                </button>
              )}
              {progress !== null ? (
                <span
                  role="status"
                  aria-live="polite"
                  className="font-mono text-[12px] tracking-tight text-ink-muted"
                >
                  {progress.completed} / {progress.total} timed runs…
                </span>
              ) : null}
            </div>

            {progress !== null ? (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-2 rounded-full bg-accent transition-[width] duration-200"
                  style={{
                    width: `${progress.total === 0 ? 0 : Math.round((progress.completed / progress.total) * 100)}%`,
                  }}
                />
              </div>
            ) : null}
          </section>

          {/* Results table */}
          <section className="panel p-5" aria-labelledby="benchmark-results-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="benchmark-results-heading" className="label">
                Measured results
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={exportRun === null}
                  className="flex h-10 items-center gap-2 rounded-md border border-line bg-surface-2 px-3 text-[11px] font-medium tracking-tight text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={13} strokeWidth={1.75} aria-hidden="true" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  disabled={exportRun === null}
                  className="flex h-10 items-center gap-2 rounded-md border border-line bg-surface-2 px-3 text-[11px] font-medium tracking-tight text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={13} strokeWidth={1.75} aria-hidden="true" />
                  Export JSON
                </button>
              </div>
            </div>

            {wasCancelled ? (
              <p
                role="status"
                className="mt-3 font-mono text-[11px] tracking-tight text-accent"
              >
                Cancelled early — the rows below are partial and were not saved to history.
              </p>
            ) : null}

            {results.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-md border border-line bg-surface-2/60 px-6 py-10 text-center">
                <TriangleAlert
                  size={22}
                  strokeWidth={1.5}
                  className="text-ink-muted"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium tracking-tight text-ink">No measurements yet</p>
                <p className="max-w-md text-[13px] leading-relaxed text-ink-muted">
                  Pick a configuration above and press Run benchmark. Timed runs stream in one at
                  a time so the page stays responsive.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b border-line">
                      {["Algorithm", "Family", "Size", "Median ms", "Comparisons", "Swaps / moves"].map(
                        (column) => (
                          <th key={column} className="label px-3 py-2 font-medium">
                            {column}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row) => (
                      <tr
                        key={`${row.algorithmId}-${row.size}`}
                        className="border-b border-line last:border-none"
                      >
                        <td className="px-3 py-2 text-[13px] tracking-tight text-ink">
                          {row.name}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] tracking-tight text-ink-muted">
                          {row.family}
                        </td>
                        <td className="px-3 py-2 font-mono text-[12px] tracking-tight text-ink-muted">
                          {row.size}
                        </td>
                        <td className="px-3 py-2 font-mono text-[12px] tracking-tight text-ink">
                          {row.medianMs.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 font-mono text-[12px] tracking-tight text-ink">
                          {row.comparisons.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-mono text-[12px] tracking-tight text-ink">
                          {row.swaps.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
                  Median of {runConfig?.trials ?? trials} trials per cell · seed{" "}
                  {runConfig?.seed ?? seedText} · every trial measured with performance.now()
                  around the fast-mode run only.
                </p>
              </div>
            )}
            <p className="sr-only">Refer to the measured results table above for exact values.</p>
          </section>

          {/* Charts */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label">Growth curves</p>
            <button
              type="button"
              role="switch"
              aria-checked={logScale}
              onClick={() => setLogScale((value) => !value)}
              className={cn(
                "inline-flex min-h-10 items-center justify-center rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
                logScale
                  ? "border-accent/60 bg-surface-2 text-accent"
                  : "border-line bg-surface text-ink-muted hover:text-ink",
              )}
            >
              Log scale: {logScale ? "on" : "off"}
            </button>
          </div>

          <ResultsChart
            title="Runtime vs input size"
            caption="Median milliseconds per run (fast mode)."
            data={chartData}
            seriesNames={seriesNames}
            logScale={logScale}
            sizeRange={runConfig ? `${runConfig.sizes[0]} to ${runConfig.sizes[runConfig.sizes.length - 1]}` : undefined}
          />
          <ResultsChart
            title="Comparisons vs input size"
            caption="Exact comparison counts — deterministic per input, and the closest thing here to a growth-rate measurement."
            data={comparisonData}
            seriesNames={seriesNames}
            logScale={logScale}
            sizeRange={runConfig ? `${runConfig.sizes[0]} to ${runConfig.sizes[runConfig.sizes.length - 1]}` : undefined}
          />

          {/* Theoretical reference — deliberately apart from the measurements. */}
          <section className="panel p-5" aria-labelledby="benchmark-reference-heading">
            <h2 id="benchmark-reference-heading" className="label">
              Theoretical reference — not measured
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
              Straight from each algorithm&apos;s registry in{" "}
              <span className="font-mono text-[12px] tracking-tight text-ink">
                src/algorithms
              </span>
              . This table is knowledge, not measurement — the charts above only APPROACH it,
              never prove it.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-line">
                    {["Algorithm", "Best time", "Average time", "Worst time", "Extra space"].map(
                      (column) => (
                        <th key={column} className="label px-3 py-2 font-medium">
                          {column}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {theoreticalReference.map((entry) => (
                    <tr key={entry.name} className="border-b border-line last:border-none">
                      <td className="px-3 py-2 text-[13px] tracking-tight text-ink">
                        {entry.name}
                      </td>
                      <td className="px-3 py-2 font-mono text-[12px] tracking-tight text-ink-muted">
                        {entry.complexity.best}
                      </td>
                      <td className="px-3 py-2 font-mono text-[12px] tracking-tight text-ink-muted">
                        {entry.complexity.average}
                      </td>
                      <td className="px-3 py-2 font-mono text-[12px] tracking-tight text-ink-muted">
                        {entry.complexity.worst}
                      </td>
                      <td className="px-3 py-2 font-mono text-[12px] tracking-tight text-ink-muted">
                        {entry.complexity.space}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Side panel */}
        <aside className="min-w-0 space-y-5" aria-label="Benchmark inspector">
          <section className="panel p-5" aria-labelledby="benchmark-method-heading">
            <h2 id="benchmark-method-heading" className="label">
              Method
            </h2>
            <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-muted">
              <li>· Same seeded input for every algorithm; a fresh copy per trial.</li>
              <li>· Fast mode only — no step generation inside the timed section.</li>
              <li>· Median of the trials; counters are deterministic per input.</li>
              <li>· The page yields between runs, so playback never freezes.</li>
            </ul>
          </section>

          <RecentExperiments
            variant="lab"
            runs={runs}
            onReopen={reopenRun}
            onForget={forget}
          />
        </aside>
      </div>
    </div>
  );
}

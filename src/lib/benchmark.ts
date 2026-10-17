import { getFastSearcher } from "../algorithms/searching/fastMode";
import { getFastSorter } from "../algorithms/sorting/fastMode";
import type { SearchAlgorithmId } from "../algorithms/searching/types";
import type { SortAlgorithmId } from "../algorithms/sorting/types";

/**
 * Benchmark Center engine — pure TypeScript, no React, no DOM calls other
 * than `performance.now()` and an optional `setTimeout` yield. The UI
 * drives it; the tests exercise it directly.
 *
 * METHOD RULES (kept here so every run obeys them):
 * - every algorithm gets its OWN fresh copy of the SAME input; one
 *   algorithm's output is never fed into another,
 * - inputs come from a SEEDED PRNG (`createRng`), so a re-run with the
 *   same config measures the exact same data,
 * - the timed section contains ONLY the fast-mode algorithm run (see
 *   the fastMode.ts file next to each algorithm) — no step generation,
 *   no rendering,
 * - the reported runtime is the MEDIAN of the trials; comparisons and
 *   swaps/moves are the deterministic per-run counters (identical across
 *   trials because every trial sees the same input),
 * - search algorithms receive the same PREPARED sorted array (sorted with
 *   the language's built-in sort, outside any timed section) so binary
 *   search's precondition holds for every input type, and look for a value
 *   that is guaranteed ABSENT — the worst case for both searches.
 *
 * NOTE: this file uses relative imports on purpose — it is imported by
 * the Vitest suite, which does not resolve the app's `@/` alias.
 */

export type BenchmarkAlgorithmId = SortAlgorithmId | SearchAlgorithmId;
export type BenchmarkFamily = "sorting" | "searching";
export type BenchmarkInputType = "random" | "sorted" | "reverse" | "nearly";

export type BenchmarkConfig = {
  algorithms: BenchmarkAlgorithmId[];
  sizes: number[];
  inputType: BenchmarkInputType;
  trials: number;
  seed: number;
};

export type BenchmarkRow = {
  algorithmId: BenchmarkAlgorithmId;
  name: string;
  family: BenchmarkFamily;
  size: number;
  inputType: BenchmarkInputType;
  trials: number;
  /** Median runtime across the trials, in milliseconds. */
  medianMs: number;
  comparisons: number;
  swaps: number;
};

export type BenchmarkRun = {
  id: string;
  createdAt: string;
  config: BenchmarkConfig;
  results: BenchmarkRow[];
};

export const BENCHMARK_ALGORITHMS: ReadonlyArray<{
  id: BenchmarkAlgorithmId;
  name: string;
  family: BenchmarkFamily;
}> = [
  { id: "bubble", name: "Bubble Sort", family: "sorting" },
  { id: "merge", name: "Merge Sort", family: "sorting" },
  { id: "linear", name: "Linear Search", family: "searching" },
  { id: "binary", name: "Binary Search", family: "searching" },
];

export const INPUT_TYPES: ReadonlyArray<{
  id: BenchmarkInputType;
  name: string;
  note: string;
}> = [
  { id: "random", name: "Random", note: "Uniformly random values — the everyday case." },
  { id: "sorted", name: "Sorted", note: "Already ascending — Bubble Sort's best case." },
  { id: "reverse", name: "Reverse sorted", note: "Descending — the classic worst case." },
  {
    id: "nearly",
    name: "Nearly sorted",
    note: "Ascending with ~5% random adjacent swaps.",
  },
];

/** The size menu the UI offers; nothing above MAX_BENCHMARK_SIZE runs. */
export const PRESET_SIZES = [100, 500, 1000, 2000] as const;
export const MAX_BENCHMARK_SIZE = 5000;
export const MIN_TRIALS = 3;
export const MAX_TRIALS = 10;
export const MAX_SEED = 2 ** 32 - 1;
export const MAX_SAVED_RUNS = 5;

/** Shown verbatim in the UI and embedded in the CSV export. */
export const BENCHMARK_NOTE =
  "Timings do not prove Big-O. Big-O describes growth; measured runtimes are noisy and depend on hardware, browser load, input distribution and implementation.";

export const BENCHMARK_HISTORY_KEY = "dsa-benchmark-runs";

// ------------------------------------------------------------------ random --

/**
 * mulberry32: a tiny, fast, fully deterministic 32-bit PRNG. The same
 * seed always produces the same sequence, so benchmark inputs (and thus
 * counters) are repeatable across runs and machines.
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------- input --

/**
 * Generates the base input for one (type, size) pair from a seed. Every
 * algorithm of a benchmark run receives a fresh copy of this SAME array,
 * so counter differences between algorithms are real algorithmic
 * differences, not input noise. Values live in [0, 999].
 */
export function generateInput(
  type: BenchmarkInputType,
  size: number,
  seed: number,
): number[] {
  const rng = createRng(seed);
  const randomValues = () =>
    Array.from({ length: size }, () => Math.floor(rng() * 1000));

  switch (type) {
    case "random":
      return randomValues();
    case "sorted":
      return randomValues().sort((a, b) => a - b);
    case "reverse":
      return randomValues().sort((a, b) => b - a);
    case "nearly": {
      const values = randomValues().sort((a, b) => a - b);
      // ~5% of the size, at least one swap once the array can hold one.
      const swaps = Math.max(size >= 2 ? 1 : 0, Math.floor(size * 0.05));
      for (let i = 0; i < swaps; i++) {
        const index = Math.floor(rng() * (size - 1));
        const held = values[index];
        values[index] = values[index + 1];
        values[index + 1] = held;
      }
      return values;
    }
    default:
      return randomValues();
  }
}

/**
 * Prepares the base input for the SEARCHING family: binary search refuses
 * unsorted input, so the base array is sorted with the LANGUAGE's built-in
 * sort — never with a benchmarked algorithm — outside any timed section.
 * Both search algorithms then receive identical fresh copies of it.
 */
export function prepareSearchInput(baseInput: readonly number[]): number[] {
  return [...baseInput].sort((a, b) => a - b);
}

/**
 * The search target: one above the maximum, i.e. guaranteed absent. That
 * is the worst case for BOTH searches — n comparisons for the linear scan
 * versus log2(n) probes for binary search — so the growth curves are
 * directly comparable.
 */
export function absentTarget(sortedInput: readonly number[]): number {
  let max = Number.NEGATIVE_INFINITY;
  for (const value of sortedInput) if (value > max) max = value;
  return max + 1;
}

// ------------------------------------------------------------------ median --

/** Median of a list; an even count averages the two middle values. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// -------------------------------------------------------------- validation --

export type ConfigValidation =
  | { ok: true; config: BenchmarkConfig }
  | { ok: false; error: string };

/**
 * Validates and NORMALIZES a config (deduped algorithms and sizes, sizes
 * sorted ascending). Returns a human-readable error for anything unsafe
 * to run: unknown algorithms, empty selections, sizes outside
 * [1, MAX_BENCHMARK_SIZE], trials outside [MIN_TRIALS, MAX_TRIALS] or a
 * negative/non-integer seed.
 */
export function validateBenchmarkConfig(config: BenchmarkConfig): ConfigValidation {
  const knownIds = BENCHMARK_ALGORITHMS.map((entry) => entry.id);

  if (!Array.isArray(config.algorithms) || config.algorithms.length === 0) {
    return { ok: false, error: "Pick at least one algorithm to benchmark." };
  }
  for (const id of config.algorithms) {
    if (!knownIds.includes(id)) {
      return {
        ok: false,
        error: `Unknown algorithm "${String(id)}" — valid ids: ${knownIds.join(", ")}.`,
      };
    }
  }
  const algorithms = [...new Set(config.algorithms)];

  if (!Array.isArray(config.sizes) || config.sizes.length === 0) {
    return { ok: false, error: "Pick at least one input size." };
  }
  for (const size of config.sizes) {
    if (!Number.isInteger(size) || size < 1 || size > MAX_BENCHMARK_SIZE) {
      return {
        ok: false,
        error: `Input sizes must be whole numbers from 1 to ${MAX_BENCHMARK_SIZE} — got ${String(size)}.`,
      };
    }
  }
  const sizes = [...new Set(config.sizes)].sort((a, b) => a - b);

  if (!INPUT_TYPES.some((entry) => entry.id === config.inputType)) {
    return {
      ok: false,
      error: `Unknown input type "${String(config.inputType)}" — valid types: ${INPUT_TYPES.map(
        (entry) => entry.id,
      ).join(", ")}.`,
    };
  }

  if (
    !Number.isInteger(config.trials) ||
    config.trials < MIN_TRIALS ||
    config.trials > MAX_TRIALS
  ) {
    return {
      ok: false,
      error: `Trials must be a whole number from ${MIN_TRIALS} to ${MAX_TRIALS} — got ${String(
        config.trials,
      )}.`,
    };
  }

  if (!Number.isInteger(config.seed) || config.seed < 0 || config.seed > MAX_SEED) {
    return {
      ok: false,
      error: `The seed must be a whole number from 0 to ${MAX_SEED} — got ${String(
        config.seed,
      )}.`,
    };
  }

  return {
    ok: true,
    config: { algorithms, sizes, inputType: config.inputType, trials: config.trials, seed: config.seed },
  };
}

// ------------------------------------------------------------------- timing --

export type TrialReport = {
  ms: number;
  comparisons: number;
  swaps: number;
};

/**
 * Runs ONE algorithm once on a fresh input copy and measures only the
 * algorithm itself with `performance.now()` — the caller prepares the
 * copy and everything else (progress UI, charting) happens outside.
 */
export function runTimedTrial(
  algorithmId: BenchmarkAlgorithmId,
  freshInput: number[],
  target: number,
): TrialReport {
  const start = performance.now();

  let comparisons = 0;
  let swaps = 0;
  if (algorithmId === "bubble" || algorithmId === "merge") {
    const outcome = getFastSorter(algorithmId).run(freshInput);
    comparisons = outcome.counters.comparisons;
    swaps = outcome.counters.swaps;
  } else {
    const outcome = getFastSearcher(algorithmId).run(freshInput, target);
    comparisons = outcome.counters.comparisons;
  }

  const ms = performance.now() - start;
  return { ms, comparisons, swaps };
}

/** Hands the event loop back so the UI can paint between timed runs. */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export type BenchmarkTaskProgress = {
  /** Timed runs finished so far (across every algorithm and size). */
  completed: number;
  /** algorithms × sizes × trials. */
  total: number;
  /** Rows (one per algorithm × size) completed so far. */
  results: BenchmarkRow[];
};

export type BenchmarkRunOptions = {
  /** Checked before each timed run; true keeps the partial rows and stops. */
  isCancelled?: () => boolean;
  /** Test seam: observes the exact fresh copy every trial receives. */
  onTrialStart?: (info: {
    algorithmId: BenchmarkAlgorithmId;
    input: number[];
    target: number;
  }) => void;
};

/**
 * Runs the benchmark one TIMED RUN at a time, yielding to the browser
 * between runs so the page never freezes. Yields after every run with the
 * current progress; the final yield carries every row. Cancellation is
 * cooperative: `isCancelled` is checked before each run, and a cancelled
 * run returns the rows completed so far.
 *
 * Throws on an invalid config — the UI validates first via
 * `validateBenchmarkConfig`, and the tests cover that function directly.
 */
export async function* runBenchmark(
  config: BenchmarkConfig,
  options: BenchmarkRunOptions = {},
): AsyncGenerator<BenchmarkTaskProgress, void, void> {
  const validated = validateBenchmarkConfig(config);
  if (!validated.ok) throw new Error(validated.error);
  const { algorithms, sizes, inputType, trials, seed } = validated.config;

  const total = algorithms.length * sizes.length * trials;
  let completed = 0;
  const results: BenchmarkRow[] = [];

  for (const algorithmId of algorithms) {
    const meta = BENCHMARK_ALGORITHMS.find((entry) => entry.id === algorithmId);
    const family: BenchmarkFamily = meta?.family ?? "sorting";
    const name = meta?.name ?? algorithmId;

    for (const size of sizes) {
      // One base input per (algorithm, size) pair — generated from the SAME
      // seed for every algorithm, so each one measures the identical data.
      const baseInput = generateInput(inputType, size, seed);
      const prepared =
        family === "searching" ? prepareSearchInput(baseInput) : baseInput;
      const target = family === "searching" ? absentTarget(prepared) : Number.NaN;

      const samples: number[] = [];
      let comparisons = 0;
      let swaps = 0;

      for (let trial = 0; trial < trials; trial += 1) {
        if (options.isCancelled?.() === true) {
          yield { completed, total, results: [...results] };
          return;
        }

        // A FRESH copy per trial — the algorithm can never see another
        // trial's (or another algorithm's) working array.
        const freshCopy = [...prepared];
        options.onTrialStart?.({ algorithmId, input: freshCopy, target });

        const report = runTimedTrial(algorithmId, freshCopy, target);
        samples.push(report.ms);
        comparisons = report.comparisons;
        swaps = report.swaps;

        completed += 1;
        yield { completed, total, results: [...results] };
        await yieldToBrowser();
      }

      results.push({
        algorithmId,
        name,
        family,
        size,
        inputType,
        trials,
        medianMs: median(samples),
        comparisons,
        swaps,
      });
    }
  }

  yield { completed, total, results: [...results] };
}

// ------------------------------------------------------------------ exports --

/** Creates an id + timestamp for a finished run (client side only). */
export function createRun(config: BenchmarkConfig, results: BenchmarkRow[]): BenchmarkRun {
  return {
    id: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    config,
    results,
  };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * CSV export: `#` comment lines carry the full benchmark configuration
 * (seed, input type, trials, algorithms, sizes and the Big-O note), then
 * one header row and one row per result.
 */
export function resultsToCsv(run: BenchmarkRun): string {
  const { config } = run;
  const lines: string[] = [
    "# DSA Command Center — Benchmark Center export",
    `# run_id: ${run.id}`,
    `# created_at: ${run.createdAt}`,
    `# seed: ${config.seed}`,
    `# input_type: ${config.inputType}`,
    `# trials: ${config.trials} (median reported)`,
    `# algorithms: ${config.algorithms.join(" ")}`,
    `# sizes: ${config.sizes.join(" ")}`,
    `# note: ${BENCHMARK_NOTE}`,
    "algorithm,family,size,input_type,trials,median_ms,comparisons,swaps_moves",
  ];

  for (const row of run.results) {
    lines.push(
      [
        row.name,
        row.family,
        row.size,
        row.inputType,
        row.trials,
        row.medianMs.toFixed(3),
        row.comparisons,
        row.swaps,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  return lines.join("\n");
}

/** JSON export: the configuration plus every result row. */
export function runToJson(run: BenchmarkRun): string {
  return JSON.stringify(
    {
      format: "dsa-command-center/benchmark-run@1",
      id: run.id,
      createdAt: run.createdAt,
      config: run.config,
      results: run.results,
    },
    null,
    2,
  );
}

// ----------------------------------------------------------------- history --

function isBenchmarkRun(value: unknown): value is BenchmarkRun {
  if (typeof value !== "object" || value === null) return false;
  const run = value as Partial<BenchmarkRun>;
  return (
    typeof run.id === "string" &&
    typeof run.createdAt === "string" &&
    typeof run.config === "object" &&
    run.config !== null &&
    Array.isArray(run.results)
  );
}

/**
 * The last MAX_SAVED_RUNS runs from localStorage, newest first. Reading is
 * fully defensive: no window (SSR/tests), blocked storage, corrupted JSON
 * or a wrong shape all yield `[]` instead of throwing.
 */
export function loadRecentRuns(): BenchmarkRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BENCHMARK_HISTORY_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isBenchmarkRun).slice(0, MAX_SAVED_RUNS);
  } catch {
    return [];
  }
}

/** Prepends a run, keeps the newest MAX_SAVED_RUNS, persists, returns them. */
export function saveRecentRun(run: BenchmarkRun): BenchmarkRun[] {
  const next = [run, ...loadRecentRuns().filter((entry) => entry.id !== run.id)].slice(
    0,
    MAX_SAVED_RUNS,
  );
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(BENCHMARK_HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked — the in-memory list still reflects the save.
    }
  }
  return next;
}

/** Forgets one saved run (by id) and returns the remaining list. */
export function removeRecentRun(runId: string): BenchmarkRun[] {
  const next = loadRecentRuns().filter((entry) => entry.id !== runId);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(BENCHMARK_HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked — nothing else to do.
    }
  }
  return next;
}

/** Empties the history. Returns the (empty) list. */
export function clearRecentRuns(): BenchmarkRun[] {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(BENCHMARK_HISTORY_KEY);
    } catch {
      // Storage blocked — nothing else to do.
    }
  }
  return [];
}

/** One-line label for a saved run, used by every "Recent experiments" list. */
export function formatRunSummary(run: BenchmarkRun): string {
  const { config } = run;
  return `${config.algorithms.length} algorithm${
    config.algorithms.length === 1 ? "" : "s"
  } · n = ${config.sizes.join(", ")} · ${config.inputType} · ${config.trials} trials · seed ${config.seed}`;
}

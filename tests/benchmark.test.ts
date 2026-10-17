import { describe, expect, it } from "vitest";
import { binarySearch } from "../src/algorithms/searching/binarySearch";
import { linearSearch } from "../src/algorithms/searching/linearSearch";
import { binarySearchFast, linearSearchFast } from "../src/algorithms/searching/fastMode";
import { bubbleSort } from "../src/algorithms/sorting/bubbleSort";
import { mergeSort } from "../src/algorithms/sorting/mergeSort";
import { bubbleSortFast, mergeSortFast } from "../src/algorithms/sorting/fastMode";
import type { BenchmarkInputType } from "../src/lib/benchmark";
import {
  BENCHMARK_HISTORY_KEY,
  BENCHMARK_NOTE,
  MAX_SAVED_RUNS,
  absentTarget,
  clearRecentRuns,
  createRng,
  formatRunSummary,
  generateInput,
  isBenchmarkRun,
  loadRecentRuns,
  median,
  prepareSearchInput,
  removeRecentRun,
  resultsToCsv,
  runBenchmark,
  runToJson,
  runTimedTrial,
  saveRecentRun,
  validateBenchmarkConfig,
  type BenchmarkConfig,
  type BenchmarkRun,
} from "../src/lib/benchmark";

const ALL_INPUT_TYPES: BenchmarkInputType[] = ["random", "sorted", "reverse", "nearly"];

describe("fast mode matches the stepped algorithms", () => {
  it("bubble and merge return identical results and counters for every input type", () => {
    for (const inputType of ALL_INPUT_TYPES) {
      const input = generateInput(inputType, 40, 7);

      const bubbleStepped = bubbleSort(input);
      const bubbleFast = bubbleSortFast(input);
      expect(bubbleFast.result, `bubble · ${inputType}`).toEqual(bubbleStepped.result);
      expect(bubbleFast.counters, `bubble · ${inputType}`).toEqual(bubbleStepped.counters);

      const mergeStepped = mergeSort(input);
      const mergeFast = mergeSortFast(input);
      expect(mergeFast.result, `merge · ${inputType}`).toEqual(mergeStepped.result);
      expect(mergeFast.counters, `merge · ${inputType}`).toEqual(mergeStepped.counters);
    }
  });

  it("linear and binary search return identical results and counters for every input type", () => {
    for (const inputType of ALL_INPUT_TYPES) {
      const prepared = prepareSearchInput(generateInput(inputType, 40, 7));
      const present = prepared[Math.floor(prepared.length / 2)];
      const absent = absentTarget(prepared);

      for (const target of [present, absent]) {
        const linearStepped = linearSearch(prepared, target);
        const linearFast = linearSearchFast(prepared, target);
        expect(linearFast.result, `linear · ${inputType} · ${target}`).toEqual(
          linearStepped.result,
        );
        expect(linearFast.counters, `linear · ${inputType} · ${target}`).toEqual(
          linearStepped.counters,
        );

        const binaryStepped = binarySearch(prepared, target);
        const binaryFast = binarySearchFast(prepared, target);
        expect(binaryFast.result, `binary · ${inputType} · ${target}`).toEqual(
          binaryStepped.result,
        );
        expect(binaryFast.counters, `binary · ${inputType} · ${target}`).toEqual(
          binaryStepped.counters,
        );
        expect(binaryFast.refusedUnsortedInput).toBe(false);
      }
    }
  });

  it("the fast modes never mutate their input", () => {
    const input = generateInput("random", 30, 11);
    const frozen = [...input];
    bubbleSortFast(input);
    mergeSortFast(input);
    linearSearchFast(input, 5);
    binarySearchFast([...input].sort((a, b) => a - b), 5);
    expect(input).toEqual(frozen);
  });
});

describe("seeded input generation", () => {
  it("the same seed produces the same input", () => {
    for (const inputType of ALL_INPUT_TYPES) {
      expect(generateInput(inputType, 60, 1234)).toEqual(generateInput(inputType, 60, 1234));
    }
  });

  it("a different seed produces a different input", () => {
    expect(generateInput("random", 60, 1)).not.toEqual(generateInput("random", 60, 2));
  });

  it("createRng is deterministic per seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    const seqC = [c(), c(), c()];
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
    for (const value of seqA) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("sorted / reverse / nearly inputs have the right shape", () => {
    const size = 200;
    const sorted = generateInput("sorted", size, 5);
    expect(sorted).toHaveLength(size);
    expect([...sorted].sort((a, b) => a - b)).toEqual(sorted);

    const reverse = generateInput("reverse", size, 5);
    expect([...reverse].sort((a, b) => b - a)).toEqual(reverse);

    const nearly = generateInput("nearly", size, 5);
    expect(nearly).toHaveLength(size);
    expect(nearly).not.toEqual(sorted);
    let descents = 0;
    for (let i = 1; i < nearly.length; i += 1) {
      if (nearly[i] < nearly[i - 1]) descents += 1;
    }
    // ~5% adjacent swaps → at most that many out-of-order neighbours.
    expect(descents).toBeLessThanOrEqual(Math.floor(size * 0.05));
  });

  it("search preparation sorts a copy and never touches the base input", () => {
    const base = generateInput("random", 50, 9);
    const frozen = [...base];
    const prepared = prepareSearchInput(base);
    expect(base).toEqual(frozen);
    expect([...prepared].sort((a, b) => a - b)).toEqual(prepared);
    expect(prepared).not.toBe(base);
  });
});

describe("median", () => {
  it("picks the middle of an odd-length list", () => {
    expect(median([5, 1, 4, 2, 3])).toBe(3);
    expect(median([9, 1, 5])).toBe(5);
    expect(median([7])).toBe(7);
  });

  it("averages the two middles of an even-length list", () => {
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([10, 20])).toBe(15);
  });

  it("does not mutate its input and reports 0 for an empty list", () => {
    const values = Object.freeze([3, 1, 2]);
    expect(median(values)).toBe(2);
    expect(values).toEqual([3, 1, 2]);
    expect(median([])).toBe(0);
  });
});

describe("validateBenchmarkConfig", () => {
  const valid: BenchmarkConfig = {
    algorithms: ["bubble", "merge"],
    sizes: [100, 500],
    inputType: "random",
    trials: 3,
    seed: 42,
  };

  it("accepts a valid config and normalizes it", () => {
    const result = validateBenchmarkConfig({
      ...valid,
      algorithms: ["merge", "bubble", "merge"],
      sizes: [500, 100, 500],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.algorithms).toEqual(["merge", "bubble"]);
      expect(result.config.sizes).toEqual([100, 500]);
    }
  });

  const invalidCases: Array<{ name: string; patch: Partial<BenchmarkConfig> }> = [
    { name: "no algorithms", patch: { algorithms: [] } },
    { name: "an unknown algorithm", patch: { algorithms: ["quicksort" as never] } },
    { name: "no sizes", patch: { sizes: [] } },
    { name: "a zero size", patch: { sizes: [0] } },
    { name: "an oversized size", patch: { sizes: [5001] } },
    { name: "a fractional size", patch: { sizes: [100.5] } },
    { name: "an unknown input type", patch: { inputType: "shuffled" as never } },
    { name: "too few trials", patch: { trials: 2 } },
    { name: "too many trials", patch: { trials: 11 } },
    { name: "fractional trials", patch: { trials: 3.5 } },
    { name: "a negative seed", patch: { seed: -1 } },
    { name: "a fractional seed", patch: { seed: 1.5 } },
  ];

  for (const { name, patch } of invalidCases) {
    it(`rejects ${name}`, () => {
      const result = validateBenchmarkConfig({ ...valid, ...patch });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
    });
  }
});

describe("runBenchmark", () => {
  const config: BenchmarkConfig = {
    algorithms: ["bubble", "merge", "linear", "binary"],
    sizes: [50],
    inputType: "nearly",
    trials: 3,
    seed: 2024,
  };

  it("runs every algorithm × size × trials, with fresh identical unmodified inputs", async () => {
    const baseInput = generateInput("nearly", 50, 2024);
    const preparedSearch = prepareSearchInput(baseInput);
    const baseFrozen = structuredClone(baseInput);
    const searchFrozen = structuredClone(preparedSearch);

    const observed: number[][] = [];
    const progress = [];
    for await (const update of runBenchmark(config, {
      onTrialStart: ({ input }) => observed.push(input),
    })) {
      progress.push(update);
    }

    // 4 algorithms × 1 size × 3 trials.
    expect(progress[progress.length - 1]).toMatchObject({ completed: 12, total: 12 });
    const results = progress[progress.length - 1].results;
    expect(results).toHaveLength(4);
    expect(results.map((row) => row.algorithmId)).toEqual(["bubble", "merge", "linear", "binary"]);

    // Every trial received its own array object…
    expect(new Set(observed).size).toBe(12);
    // …holding the identical input the run prepared for that family:
    // sorting trials (first two algorithms, 3 trials each) saw the raw
    // base input, search trials the identically prepared sorted copy.
    const sortingCopies = observed.slice(0, 6);
    const searchCopies = observed.slice(6);
    for (const copy of sortingCopies) expect(copy).toEqual(baseFrozen);
    for (const copy of searchCopies) expect(copy).toEqual(searchFrozen);

    // The generator never mutated the inputs it prepared.
    expect(baseInput).toEqual(baseFrozen);
    expect(preparedSearch).toEqual(searchFrozen);

    // Counters are deterministic across trials, so each row reports them once.
    for (const row of results) {
      expect(row.medianMs).toBeGreaterThanOrEqual(0);
      expect(row.comparisons).toBeGreaterThanOrEqual(0);
      expect(row.size).toBe(50);
      expect(row.trials).toBe(3);
      expect(row.inputType).toBe("nearly");
    }
  });

  it("stops early when cancelled and keeps the partial rows", async () => {
    let runs = 0;
    let lastSeen = { completed: 0, total: 0, results: [] as never[] };
    for await (const update of runBenchmark(config, {
      isCancelled: () => runs >= 2,
      onTrialStart: () => {
        runs += 1;
      },
    })) {
      lastSeen = update as typeof lastSeen;
    }
    expect(runs).toBe(2);
    expect(lastSeen.completed).toBeLessThan(lastSeen.total);
  });

  it("throws on an invalid config", async () => {
    const generator = runBenchmark({ ...config, trials: 1 });
    await expect(generator.next()).rejects.toThrow();
  });
});

describe("runTimedTrial", () => {
  it("measures only the algorithm and reports its counters", () => {
    const input = generateInput("random", 100, 3);
    const report = runTimedTrial("merge", [...input], Number.NaN);
    expect(report.ms).toBeGreaterThanOrEqual(0);
    expect(report.comparisons).toBeGreaterThan(0);
    expect(report.swaps).toBeGreaterThan(0);

    const sorted = prepareSearchInput(input);
    const target = absentTarget(sorted);
    const linear = runTimedTrial("linear", [...sorted], target);
    expect(linear.comparisons).toBe(sorted.length);
    const binary = runTimedTrial("binary", [...sorted], target);
    expect(binary.comparisons).toBeLessThanOrEqual(Math.floor(Math.log2(sorted.length)) + 1);
    expect(binary.comparisons).toBeLessThan(linear.comparisons);
  });
});

function sampleRun(): BenchmarkRun {
  return {
    id: "run-test-1",
    createdAt: "2026-10-17T12:00:00.000Z",
    config: {
      algorithms: ["bubble", "linear"],
      sizes: [100, 500],
      inputType: "sorted",
      trials: 5,
      seed: 99,
    },
    results: [
      {
        algorithmId: "bubble",
        name: "Bubble Sort",
        family: "sorting",
        size: 100,
        inputType: "sorted",
        trials: 5,
        medianMs: 1.23456,
        comparisons: 99,
        swaps: 0,
      },
      {
        algorithmId: "linear",
        name: "Linear Search",
        family: "searching",
        size: 500,
        inputType: "sorted",
        trials: 5,
        medianMs: 12.5,
        comparisons: 500,
        swaps: 0,
      },
    ],
  };
}

describe("resultsToCsv", () => {
  it("emits a config header comment, the documented header and one row per result", () => {
    const run = sampleRun();
    const csv = resultsToCsv(run);
    const lines = csv.split("\n");

    // Every pre-table line is a `#` comment carrying the configuration.
    const commentLines = lines.filter((line) => line.startsWith("#"));
    expect(commentLines.length).toBe(9);
    expect(commentLines.some((line) => line.includes("seed: 99"))).toBe(true);
    expect(commentLines.some((line) => line.includes("input_type: sorted"))).toBe(true);
    expect(commentLines.some((line) => line.includes("trials: 5"))).toBe(true);
    expect(commentLines.some((line) => line.includes("algorithms: bubble linear"))).toBe(true);
    expect(commentLines.some((line) => line.includes("sizes: 100 500"))).toBe(true);
    expect(commentLines.some((line) => line.includes(BENCHMARK_NOTE))).toBe(true);

    const header = lines[commentLines.length];
    expect(header).toBe(
      "algorithm,family,size,input_type,trials,median_ms,comparisons,swaps_moves",
    );

    const rows = lines.slice(commentLines.length + 1);
    expect(rows).toHaveLength(run.results.length);
    expect(rows[0]).toBe("Bubble Sort,sorting,100,sorted,5,1.235,99,0");
    expect(rows[1]).toBe("Linear Search,searching,500,sorted,5,12.500,500,0");
  });

  it("quotes cells that contain commas", () => {
    const run = sampleRun();
    run.results[0].name = 'Bubble, "Sort"';
    const rows = resultsToCsv(run).split("\n").slice(10);
    expect(rows[0].startsWith('"Bubble, ""Sort""",sorting')).toBe(true);
  });

  it("neutralizes spreadsheet formula injection in a cell starting with '='", () => {
    const run = sampleRun();
    run.results[0].name = "=1+1";
    run.results[1].name = "@SUM(A1)";
    const rows = resultsToCsv(run).split("\n").slice(10);
    expect(rows[0]).toBe("'=1+1,sorting,100,sorted,5,1.235,99,0");
    expect(rows[1]).toBe("'@SUM(A1),searching,500,sorted,5,12.500,500,0");
  });

  it("prefixes a single quote on every formula trigger: = + - @ tab CR", () => {
    for (const trigger of ["=", "+", "-", "@", "\t", "\r"]) {
      const run = sampleRun();
      run.results[0].name = `${trigger}evil`;
      const firstRow = resultsToCsv(run).split("\n")[10];
      expect(firstRow.startsWith(`'${trigger}evil,`), `trigger ${JSON.stringify(trigger)}`).toBe(
        true,
      );
    }
  });

  it("still quotes a neutralized cell that also contains a comma", () => {
    const run = sampleRun();
    run.results[0].name = "=SUM(A1, B2)";
    const firstRow = resultsToCsv(run).split("\n")[10];
    expect(firstRow).toBe(`"'=SUM(A1, B2)",sorting,100,sorted,5,1.235,99,0`);
  });

  it("keeps numeric cells plain numbers, negatives included", () => {
    const run = sampleRun();
    run.results[0].medianMs = -1.5; // exported as the numeric string "-1.500"
    run.results[0].comparisons = -42; // exported from the number itself
    run.results[1].swaps = -7;
    const rows = resultsToCsv(run).split("\n").slice(10);
    expect(rows[0]).toBe("Bubble Sort,sorting,100,sorted,5,-1.500,-42,0");
    expect(rows[1]).toBe("Linear Search,searching,500,sorted,5,12.500,500,-7");
    expect(rows[0]).not.toContain("'-");
  });
});

describe("runToJson", () => {
  it("round-trips the configuration and results", () => {
    const run = sampleRun();
    const parsed = JSON.parse(runToJson(run)) as {
      config: BenchmarkConfig;
      results: unknown;
      id: string;
      createdAt: string;
    };
    expect(parsed.config).toEqual(run.config);
    expect(parsed.results).toEqual(run.results);
    expect(parsed.id).toBe(run.id);
    expect(parsed.createdAt).toBe(run.createdAt);
  });
});

describe("isBenchmarkRun — full shape validation", () => {
  it("accepts a well-formed run", () => {
    expect(isBenchmarkRun(sampleRun())).toBe(true);
  });

  it("rejects tampered shapes instead of trusting them", () => {
    const run = sampleRun();
    const row = run.results[0];

    const rejected: Array<[string, unknown]> = [
      ["a non-object", "run-test-1"],
      ["a null entry", null],
      ["a numeric id", { ...run, id: 42 }],
      ["a non-string id", { ...run, id: undefined }],
      ["an unparseable createdAt", { ...run, createdAt: "yesterday afternoon" }],
      ["a missing createdAt", { ...run, createdAt: undefined }],
      ["a config that is a string", { ...run, config: "bubble merge" }],
      ["a null config", { ...run, config: null }],
      ["an unknown algorithm", { ...run, config: { ...run.config, algorithms: ["quicksort"] } }],
      ["a string size", { ...run, config: { ...run.config, sizes: ["100"] } }],
      ["a zero size", { ...run, config: { ...run.config, sizes: [0] } }],
      ["an oversized size", { ...run, config: { ...run.config, sizes: [5001] } }],
      ["an unknown input type", { ...run, config: { ...run.config, inputType: "shuffled" } }],
      ["fractional trials", { ...run, config: { ...run.config, trials: 3.5 } }],
      ["out-of-range trials", { ...run, config: { ...run.config, trials: 999 } }],
      ["a negative seed", { ...run, config: { ...run.config, seed: -1 } }],
      ["results that are not an array", { ...run, results: "1,2,3" }],
      ["a string median", { ...run, results: [{ ...row, medianMs: "1.235" }] }],
      ["a NaN median", { ...run, results: [{ ...row, medianMs: Number.NaN }] }],
      ["an infinite median", { ...run, results: [{ ...row, medianMs: Number.POSITIVE_INFINITY }] }],
      ["a null comparison count", { ...run, results: [{ ...row, comparisons: null }] }],
      ["a string swap count", { ...run, results: [{ ...row, swaps: "0" }] }],
      ["a zero-sized row", { ...run, results: [{ ...row, size: 0 }] }],
      ["a wrong family", { ...run, results: [{ ...row, family: "hashing" }] }],
      ["an unknown row algorithm", { ...run, results: [{ ...row, algorithmId: "quicksort" }] }],
      ["a row that is not an object", { ...run, results: [null] }],
    ];

    for (const [name, value] of rejected) {
      expect(isBenchmarkRun(value), name).toBe(false);
    }
  });

  it("drops tampered saved runs from storage without throwing", () => {
    // Minimal in-memory localStorage stand-in (same seam as the history test).
    const store = new Map<string, string>();
    const globals = globalThis as { window?: unknown };
    globals.window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    };

    try {
      const valid = sampleRun();
      const tampered: unknown[] = [
        { ...valid, id: 42 },
        { ...valid, createdAt: "not a date" },
        { ...valid, config: { ...valid.config, trials: 999 } },
        { ...valid, results: [{ ...valid.results[0], medianMs: "1.235" }] },
        { ...valid, results: [{ ...valid.results[0], size: 5001 }] },
        null,
        "run-test-2",
        7,
      ];
      store.set(BENCHMARK_HISTORY_KEY, JSON.stringify([valid, ...tampered]));

      const runs = loadRecentRuns();
      expect(runs).toHaveLength(1);
      expect(runs[0].id).toBe("run-test-1");
      for (const run of runs) expect(() => formatRunSummary(run)).not.toThrow();

      expect(clearRecentRuns()).toEqual([]);
    } finally {
      delete globals.window;
    }
  });
});

describe("recent runs history", () => {
  it("degrades gracefully when there is no window (SSR / tests)", () => {
    expect(loadRecentRuns()).toEqual([]);
    const list = saveRecentRun(sampleRun());
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("run-test-1");
    expect(removeRecentRun("run-test-1")).toEqual([]);
    expect(clearRecentRuns()).toEqual([]);
    expect(formatRunSummary(sampleRun())).toBe(
      "2 algorithms · n = 100, 500 · sorted · 5 trials · seed 99",
    );
  });

  it("caps the stored history and survives corrupted storage", () => {
    // A minimal in-memory localStorage stand-in, so the persistence path
    // (and every try/catch around it) runs under Node too.
    const store = new Map<string, string>();
    const globals = globalThis as { window?: unknown };
    globals.window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    };

    try {
      let runs: BenchmarkRun[] = [];
      for (let i = 0; i < MAX_SAVED_RUNS + 2; i += 1) {
        runs = saveRecentRun({ ...sampleRun(), id: `run-${i}` });
      }
      expect(runs).toHaveLength(MAX_SAVED_RUNS);
      expect(runs[0].id).toBe(`run-${MAX_SAVED_RUNS + 1}`);
      expect(loadRecentRuns()).toHaveLength(MAX_SAVED_RUNS);

      expect(removeRecentRun(`run-${MAX_SAVED_RUNS + 1}`)).toHaveLength(MAX_SAVED_RUNS - 1);

      // Corrupted JSON degrades to an empty list instead of throwing.
      store.set(BENCHMARK_HISTORY_KEY, "{not json");
      expect(loadRecentRuns()).toEqual([]);

      // A wrong shape degrades the same way.
      store.set(BENCHMARK_HISTORY_KEY, JSON.stringify({ nope: true }));
      expect(loadRecentRuns()).toEqual([]);

      expect(clearRecentRuns()).toEqual([]);
      expect(loadRecentRuns()).toEqual([]);
    } finally {
      delete globals.window;
    }
  });
});

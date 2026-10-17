"use client";

import { Clock3, History, Inbox, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  formatRunSummary,
  isBenchmarkRun,
  type BenchmarkRun,
} from "@/lib/benchmark";
import { useRecentBenchmarkRuns } from "@/hooks/useRecentBenchmarkRuns";

type DashboardProps = {
  variant: "dashboard";
  runs?: undefined;
  onReopen?: undefined;
  onForget?: undefined;
};

type LabProps = {
  /** The lab owns the run list (it also saves into it), so it passes it in. */
  variant: "lab";
  runs: BenchmarkRun[];
  onReopen: (run: BenchmarkRun) => void;
  onForget: (runId: string) => void;
};

type RecentExperimentsProps = DashboardProps | LabProps;

/**
 * Local timestamp of a saved run. A run whose `createdAt` is not a real
 * date is already filtered out by `isBenchmarkRun`, but the formatter is
 * still defensive so a rejected/tampered entry can never surface an
 * "Invalid Date" label.
 */
function runTimestamp(run: BenchmarkRun): string {
  const time = Date.parse(run.createdAt);
  return Number.isNaN(time) ? "Unknown date" : new Date(time).toLocaleString();
}

function RunTimestamp({ run }: { run: BenchmarkRun }) {
  return (
    <span className="font-mono text-[11px] tracking-tight text-ink-muted">
      {runTimestamp(run)}
    </span>
  );
}

/**
 * The shared "Recent experiments" list of saved benchmark runs (newest
 * first, at most five — the cap lives in `src/lib/benchmark.ts`).
 *
 * - `dashboard` reads localStorage itself after hydration and links each
 *   run back to the Complexity Lab (`/complexity?run=<id>`).
 * - `lab` is driven by the Benchmark Center's own list: Reopen loads the
 *   run back into the UI, Forget removes it from storage.
 * - Anything that fails `isBenchmarkRun` (a tampered or corrupted entry) is
 *   skipped, so the list never throws and never shows an "Invalid Date".
 */
export function RecentExperiments(props: RecentExperimentsProps) {
  const selfLoaded = useRecentBenchmarkRuns();
  const loaded = props.runs ?? (props.variant === "dashboard" ? selfLoaded.runs : []);
  // Defensive: a tampered/corrupted entry is dropped here instead of being
  // rendered (and never reaching `formatRunSummary` / the date formatter).
  const runs = loaded.filter(isBenchmarkRun);

  return (
    <section className="panel p-6" aria-labelledby="recent-heading">
      <div className="flex items-center justify-between gap-4">
        <h2 id="recent-heading" className="label">
          <span className="inline-flex items-center gap-1.5">
            <History size={12} strokeWidth={1.75} aria-hidden="true" />
            Recent experiments
          </span>
        </h2>
        <span className="font-mono text-[11px] text-ink-muted">
          {runs.length} saved
        </span>
      </div>

      {runs.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-md border border-line bg-surface-2/60 px-6 py-10 text-center">
          <Inbox size={22} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />
          <p className="text-sm font-medium tracking-tight text-ink">No experiments yet</p>
          <p className="max-w-md text-[13px] leading-relaxed text-ink-muted">
            {props.variant === "dashboard"
              ? "Completed runs from the Benchmark Center will be listed here with their configuration — seed, input type, sizes and trials — and can be reopened in the lab."
              : "Run a benchmark to save its configuration and results here. The last five runs are kept in this browser."}
          </p>
          <Link
            href="/complexity"
            className="mt-1 flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-4 text-[12px] font-medium tracking-tight text-ink transition-colors hover:border-white/20"
          >
            <Clock3 size={14} strokeWidth={1.75} aria-hidden="true" />
            {props.variant === "dashboard"
              ? "Open the Complexity Lab"
              : "Start with a benchmark run"}
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {runs.map((run) => (
            <li
              key={run.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface-2 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium tracking-tight text-ink">
                  {formatRunSummary(run)}
                </p>
                <p className="mt-0.5">
                  <RunTimestamp run={run} />
                </p>
              </div>

              {props.variant === "dashboard" ? (
                <Link
                  href={`/complexity?run=${encodeURIComponent(run.id)}`}
                  className="flex h-10 shrink-0 items-center gap-2 rounded-md border border-accent/50 px-3 text-[11px] font-medium tracking-tight text-accent transition-colors hover:bg-[#1c1c1c]"
                >
                  <RotateCcw size={13} strokeWidth={1.75} aria-hidden="true" />
                  Reopen
                </Link>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => props.onReopen(run)}
                    className="flex h-10 items-center gap-2 rounded-md border border-accent/50 px-3 text-[11px] font-medium tracking-tight text-accent transition-colors hover:bg-[#1c1c1c]"
                  >
                    <RotateCcw size={13} strokeWidth={1.75} aria-hidden="true" />
                    Reopen
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onForget(run.id)}
                    aria-label={`Forget run from ${runTimestamp(run)}`}
                    title="Forget this run"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:text-ink"
                  >
                    <Trash2 size={13} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

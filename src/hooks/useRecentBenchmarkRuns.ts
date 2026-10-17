"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadRecentRuns,
  removeRecentRun,
  saveRecentRun,
  type BenchmarkRun,
} from "@/lib/benchmark";

/**
 * The saved benchmark runs (last 5, newest first) as client state.
 *
 * localStorage is only read AFTER hydration (`useEffect`), so the first
 * render always matches the server-rendered markup; every storage access
 * is already wrapped in try/catch inside `src/lib/benchmark.ts`.
 */
export function useRecentBenchmarkRuns() {
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);

  useEffect(() => {
    setRuns(loadRecentRuns());
  }, []);

  /** Persists a finished run and returns the refreshed list. */
  const remember = useCallback((run: BenchmarkRun) => {
    setRuns(saveRecentRun(run));
  }, []);

  /** Forgets one run by id. */
  const forget = useCallback((runId: string) => {
    setRuns(removeRecentRun(runId));
  }, []);

  return { runs, remember, forget };
}

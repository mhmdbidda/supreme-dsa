"use client";

import { useEffect, useState } from "react";
import { BenchmarkCenter } from "@/components/visualizers/BenchmarkCenter";
import { RecursionVisualizer } from "@/components/visualizers/RecursionVisualizer";
import { SegmentedControl } from "@/components/controls/SegmentedControl";

type LabMode = "recursion" | "benchmark";

/**
 * The Complexity Lab hosts both experiments behind one toggle.
 *
 * Landing on `/complexity?run=<id>` (the dashboard's Recent experiments
 * list) opens the Benchmark Center so the saved run can be reopened there.
 * The query string is read AFTER hydration, so the whole page still
 * prerenders statically.
 */
export function ComplexityLab() {
  const [mode, setMode] = useState<LabMode>("recursion");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("run") !== null) {
      setMode("benchmark");
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="label">Module 05 · Complexity</p>
        <div className="space-y-2">
          <p className="label">Experiment</p>
          <SegmentedControl
            label="Complexity lab experiment"
            value={mode}
            options={[
              { value: "recursion", label: "Recursion Visualizer" },
              { value: "benchmark", label: "Benchmark Center" },
            ]}
            onChange={setMode}
          />
        </div>
      </div>

      {mode === "recursion" ? <RecursionVisualizer /> : <BenchmarkCenter />}
    </div>
  );
}

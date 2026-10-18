"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { bubbleSort } from "@/algorithms/sorting";
import { BarChart } from "@/components/visualizers/BarChart";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { HERO_SORT_INPUT, nextHeroFrame } from "@/lib/heroPreview";
import { summarizeProgress } from "@/lib/progress";

/**
 * One precomputed sort, played back in a loop behind the landing hero.
 *
 * Nothing here is simulated: `HERO_SORT_INPUT` runs through the same pure
 * `bubbleSort` engine the Sorting Lab uses (at module scope, once), and the
 * preview only advances an index over that recorded step stream — the same
 * generate-then-play-back model as every lab.
 *
 * Motion honours `prefers-reduced-motion`: the loop starts paused for those
 * users and the button lets them opt in (or pause at any time).
 */

/** Frames are read ~6 per second — the same default speed as the labs. */
const STEP_MS = 170;
/** Hold the finished (fully sorted) frame before looping back to step one. */
const FINAL_HOLD_MS = 1600;

const HERO_SORT = bubbleSort([...HERO_SORT_INPUT]);

export function HeroSortPreview() {
  const { steps } = HERO_SORT;
  const prefersReducedMotion = usePrefersReducedMotion();
  const [frame, setFrame] = useState(0);
  /** `null` = follow the motion preference; set once the user presses the button. */
  const [manualPause, setManualPause] = useState<boolean | null>(null);
  const paused = manualPause ?? prefersReducedMotion;

  useEffect(() => {
    if (paused || steps.length < 2) return;
    const atEnd = frame >= steps.length - 1;
    const timer = setTimeout(
      () => setFrame((current) => nextHeroFrame(current, steps.length)),
      atEnd ? FINAL_HOLD_MS : STEP_MS,
    );
    return () => clearTimeout(timer);
  }, [paused, frame, steps.length]);

  const step = steps[Math.min(frame, steps.length - 1)];
  const progress = summarizeProgress(steps, frame);

  return (
    <section aria-labelledby="preview-heading" className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="preview-heading" className="label">
          Live preview · Bubble Sort
        </h2>
        <button
          type="button"
          onClick={() => setManualPause(!paused)}
          aria-label={
            paused
              ? "Play the bubble sort preview"
              : "Pause the bubble sort preview"
          }
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-3 text-[11px] font-medium tracking-tight text-ink-muted transition-colors hover:text-ink"
        >
          {paused ? (
            <Play size={13} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Pause size={13} strokeWidth={2} aria-hidden="true" />
          )}
          {paused ? "Play" : "Pause"}
        </button>
      </div>

      <div className="mt-4 h-44 sm:h-56 lg:h-64">
        <BarChart
          array={step.array}
          activeIndices={step.activeIndices}
          comparedIndices={step.comparedIndices}
          sortedIndices={step.sortedIndices}
          ariaLabel={`Bar chart of ${HERO_SORT_INPUT.length} values, bubble sort preview step ${progress.stepNumber} of ${progress.totalSteps}: ${step.description}`}
        />
      </div>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="font-mono text-[11px] leading-relaxed tracking-tight text-ink-muted">
          <span className="text-ink">{progress.stepNumber}</span>/
          {progress.totalSteps} ·{" "}
          <span className="text-ink">{progress.comparisons}</span> comparisons ·{" "}
          <span className="text-ink">{progress.swaps}</span> swaps
        </p>
        <p className="min-w-0 text-[12px] leading-relaxed text-ink-muted sm:text-right">
          {step.description}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
        Every frame is a real step from the lab&apos;s{" "}
        <span className="font-mono text-ink">bubbleSort()</span> engine —
        precomputed once, then played back in a loop.
      </p>
    </section>
  );
}

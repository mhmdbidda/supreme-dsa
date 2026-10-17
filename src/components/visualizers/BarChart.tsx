"use client";

import { cn } from "@/lib/utils";

type BarChartProps = {
  array: number[];
  activeIndices?: number[];
  comparedIndices?: number[];
  sortedIndices?: number[];
  /**
   * Binary search window: every bar outside `[low, high]` is dimmed.
   * Sorting never passes it, so its rendering is unchanged.
   */
  dimRange?: { low: number; high: number } | null;
  /** Describes the current frame; used as the accessible name. */
  ariaLabel: string;
};

const MIN_BAR_HEIGHT = 6;
/** Labels above bars need headroom; scale every bar by the same factor. */
const LABEL_HEADROOM = 0.86;

/**
 * Large bar visualization for the sorting lab.
 * Colour precedence: sorted (dim green) > active (accent) > compared (muted).
 * Height and colour transition in ~150ms so steps read as motion, not decoration.
 */
export function BarChart({
  array,
  activeIndices,
  comparedIndices,
  sortedIndices,
  dimRange,
  ariaLabel,
}: BarChartProps) {
  const showLabels = array.length > 0 && array.length <= 16;
  const active = new Set(activeIndices ?? []);
  const compared = new Set(comparedIndices ?? []);
  const sorted = new Set(sortedIndices ?? []);

  const min = array.length > 0 ? Math.min(...array) : 0;
  const max = array.length > 0 ? Math.max(...array) : 0;
  const range = max - min;
  const headroom = showLabels ? LABEL_HEADROOM : 1;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="flex h-full w-full items-end gap-[3px]"
    >
      {array.map((value, index) => {
        const t = range === 0 ? 0.5 : (value - min) / range;
        const height = (MIN_BAR_HEIGHT + (100 - MIN_BAR_HEIGHT) * t) * headroom;

        const isSorted = sorted.has(index);
        const isActive = active.has(index);
        const isCompared = compared.has(index);
        const isDimmed =
          dimRange != null && (index < dimRange.low || index > dimRange.high);

        const tone = isSorted
          ? "bg-sorted"
          : isActive
            ? "bg-accent"
            : isCompared
              ? "bg-compare"
              : "bg-bar";

        // Shape cues so state never relies on colour alone: sorted bars get a
        // solid top edge, the active bar a bright outline, compared bars a
        // dashed top edge.
        const cue = isSorted
          ? "border-t-2 border-sorted"
          : isActive
            ? "outline outline-1 -outline-offset-1 outline-white/70"
            : isCompared
              ? "border-t-2 border-dashed border-compare"
              : null;

        return (
          <div
            key={index}
            className={cn(
              "flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5 transition-opacity duration-150 ease-out",
              isDimmed && "opacity-30",
            )}
          >
            {showLabels ? (
              <span
                className={cn(
                  "truncate text-center font-mono text-[10px] tracking-tight transition-colors duration-150",
                  isSorted
                    ? "text-sorted"
                    : isActive
                      ? "text-accent"
                      : isCompared
                        ? // The bar keeps --color-compare; the label uses the
                          // lighter ink so 10px text clears 4.5:1.
                          "text-compare-ink"
                        : "text-ink-muted",
                )}
              >
                {value}
              </span>
            ) : null}
            <div
              className={cn(
                "w-full rounded-t-[2px] transition-[height,background-color] duration-150 ease-out",
                tone,
                cue,
              )}
              style={{ height: `${height}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { Inbox } from "lucide-react";
import type { DSSnapshot } from "@/algorithms/data-structures";
import { cn } from "@/lib/utils";

type StackVisualizerProps = {
  /** Structure state; used only while no step is being played back. */
  items: readonly number[];
  /** The snapshot currently displayed by the playback controls. */
  step: DSSnapshot | null;
  emptyMessage: string;
};

/**
 * Vertical stack column: `items[0]` (the bottom) renders at the bottom and
 * the last item renders at the top, tagged with a TOP label. The highlighted
 * row takes the accent tone so the pointer move reads as motion.
 */
export function StackVisualizer({ items, step, emptyMessage }: StackVisualizerProps) {
  const shown = step?.items ?? items;
  const highlight = new Set(step?.highlight ?? []);
  const pointers = step?.pointers ?? {};

  if (shown.length === 0) {
    return (
      <div className="m-auto flex max-w-sm flex-col items-center gap-3 text-center">
        <Inbox size={22} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />
        {/* "Stack is empty" — the hint before the dash is the designed heading. */}
        <p className="text-sm font-medium tracking-tight text-ink">
          {emptyMessage.split(" — ")[0]}
        </p>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          {step?.description ?? emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={step?.description ?? `Stack with ${shown.length} item(s)`}
      className="m-auto flex w-full max-w-[320px] flex-col-reverse gap-2"
    >
      {shown.map((value, index) => {
        const isTop = pointers.top === index;
        const isHighlighted = highlight.has(index);
        return (
          <div key={index} className="flex items-center gap-3">
            <span className="w-5 text-right font-mono text-[10px] text-ink-muted">
              {index}
            </span>
            <div
              className={cn(
                "flex h-11 flex-1 items-center justify-center rounded-md border font-mono text-[15px] tracking-tight transition-colors duration-150",
                isHighlighted
                  ? "border-accent/70 bg-accent/10 text-accent outline outline-2 -outline-offset-2 outline-accent/50"
                  : "border-line bg-surface-2 text-ink",
              )}
            >
              {value}
            </div>
            <span
              className={cn(
                "w-10 font-mono text-[10px] uppercase tracking-[0.12em]",
                isTop ? "text-accent" : "text-transparent",
              )}
            >
              {isTop ? "Top" : "·"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

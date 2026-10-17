"use client";

import { Fragment } from "react";
import { Inbox } from "lucide-react";
import type { DSSnapshot } from "@/algorithms/data-structures";
import { cn } from "@/lib/utils";

type QueueVisualizerProps = {
  /** Structure state; used only while no step is being played back. */
  items: readonly number[];
  /** The snapshot currently displayed by the playback controls. */
  step: DSSnapshot | null;
  emptyMessage: string;
};

/**
 * Horizontal queue row: `items[0]` sits on the left under the FRONT label,
 * the last item sits on the right under the REAR label. Arrows between the
 * boxes show the direction nodes link in.
 */
export function QueueVisualizer({ items, step, emptyMessage }: QueueVisualizerProps) {
  const shown = step?.items ?? items;
  const highlight = new Set(step?.highlight ?? []);
  const pointers = step?.pointers ?? {};

  if (shown.length === 0) {
    return (
      <div className="m-auto flex max-w-sm flex-col items-center gap-3 text-center">
        <Inbox size={22} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />
        {/* "Queue is empty" — the hint before the dash is the designed heading. */}
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
      aria-label={step?.description ?? `Queue with ${shown.length} node(s)`}
      className="m-auto flex w-full items-center gap-1.5 overflow-x-auto px-1 py-2"
    >
      {shown.map((value, index) => {
        const isFront = pointers.front === index;
        const isRear = pointers.rear === index;
        const isHighlighted = highlight.has(index);
        return (
          <Fragment key={index}>
            {index > 0 ? (
              <span className="shrink-0 font-mono text-[13px] text-ink-muted" aria-hidden="true">
                →
              </span>
            ) : null}
            <div className="flex w-[72px] shrink-0 flex-col items-center gap-1">
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.12em]",
                  isFront ? "text-accent" : "text-transparent",
                )}
              >
                {isFront ? "Front" : "·"}
              </span>
              <div
                className={cn(
                  "flex h-12 w-full items-center justify-center rounded-md border font-mono text-[15px] tracking-tight transition-colors duration-150",
                  isHighlighted
                    ? "border-accent/70 bg-accent/10 text-accent"
                    : "border-line bg-surface-2 text-ink",
                )}
              >
                {value}
              </div>
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.12em]",
                  isRear ? "text-accent" : "text-transparent",
                )}
              >
                {isRear ? "Rear" : "·"}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

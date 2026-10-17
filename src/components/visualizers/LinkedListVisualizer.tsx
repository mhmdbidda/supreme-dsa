"use client";

import { Fragment } from "react";
import type { DSSnapshot } from "@/algorithms/data-structures";
import { cn } from "@/lib/utils";

type LinkedListVisualizerProps = {
  /** Structure state; used only while no step is being played back. */
  items: readonly number[];
  /** The snapshot currently displayed by the playback controls. */
  step: DSSnapshot | null;
  emptyMessage: string;
};

/** Empty list: the designed empty state plus the HEAD → null terminator. */
function EmptyList({ message }: { message: string }) {
  return (
    <div className="m-auto flex max-w-sm flex-col items-center gap-3 text-center">
      {/* "List is empty" — the hint before the dash is the designed heading. */}
      <p className="text-sm font-medium tracking-tight text-ink">
        {message.split(" — ")[0]}
      </p>
      <p className="text-[13px] leading-relaxed text-ink-muted">{message}</p>
      <p className="font-mono text-[12px] tracking-tight text-ink-muted" aria-hidden="true">
        HEAD → <span className="text-accent/80">null</span>
      </p>
    </div>
  );
}

/**
 * Horizontal node chain: value boxes joined by arrows, a HEAD label over
 * the first node, a TAIL label over the last, a `null` terminator after
 * the final arrow, and a `current` marker under the node an operation is
 * visiting. Highlighted nodes take the accent tone.
 */
export function LinkedListVisualizer({
  items,
  step,
  emptyMessage,
}: LinkedListVisualizerProps) {
  const shown = step?.items ?? items;
  const highlight = new Set(step?.highlight ?? []);
  const pointers = step?.pointers ?? {};

  if (shown.length === 0) {
    return <EmptyList message={step?.description ?? emptyMessage} />;
  }

  return (
    <div
      role="img"
      aria-label={step?.description ?? `Linked list with ${shown.length} node(s)`}
      className="m-auto flex w-full items-center gap-1.5 overflow-x-auto px-1 py-3"
    >
      {shown.map((value, index) => {
        const isHead = pointers.head === index;
        const isTail = pointers.tail === index;
        const isCurrent = pointers.current === index;
        const isHighlighted = highlight.has(index);
        const topLabels = [
          isHead ? "Head" : null,
          isTail ? "Tail" : null,
        ].filter(Boolean);

        return (
          <Fragment key={index}>
            {index > 0 ? (
              <span className="shrink-0 font-mono text-[13px] text-ink-muted" aria-hidden="true">
                →
              </span>
            ) : null}
            <div className="flex w-[68px] shrink-0 flex-col items-center gap-1">
              <span className="h-4 font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
                {topLabels.join(" · ")}
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
                  "h-4 font-mono text-[10px] uppercase tracking-[0.12em]",
                  isCurrent ? "text-accent" : "text-transparent",
                )}
              >
                {isCurrent ? "▼ current" : "·"}
              </span>
            </div>
          </Fragment>
        );
      })}
      <span className="shrink-0 font-mono text-[13px] text-ink-muted" aria-hidden="true">
        →
      </span>
      <span className="shrink-0 font-mono text-[12px] tracking-tight text-ink-muted">null</span>
    </div>
  );
}

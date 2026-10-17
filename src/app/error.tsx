"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

/**
 * Route-level error boundary, rendered in the same design language as the
 * rest of the lab. `reset` re-renders the failed segment; `error.digest` is
 * the production-safe reference id when the message is redacted.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="label">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink">
          Unexpected error
        </h1>
      </div>

      <section className="panel p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-accent/40 bg-surface-2 text-accent">
            <TriangleAlert size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="space-y-5">
            <p className="max-w-xl text-sm leading-relaxed text-ink-muted">
              This page hit an unexpected error and could not finish rendering.
              The rest of the lab is unaffected — retrying usually clears it.
            </p>
            {error.digest ? (
              <p className="font-mono text-[11px] tracking-tight text-ink-muted">
                Reference: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-accent/60 bg-surface-2 px-4 text-[12px] font-medium tracking-tight text-accent transition-colors hover:bg-[#1c1c1c]"
            >
              <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

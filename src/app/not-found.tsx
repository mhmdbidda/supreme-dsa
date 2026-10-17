import type { Metadata } from "next";
import Link from "next/link";
import { Compass, LayoutDashboard } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for does not exist in the lab.",
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="label">Error 404</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink">
          Page not found
        </h1>
      </div>

      <section className="panel p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-ink-muted">
            <Compass size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="space-y-5">
            <p className="max-w-xl text-sm leading-relaxed text-ink-muted">
              That route does not exist. The lab is small — the dashboard lists
              every module that is built today.
            </p>
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-accent/60 bg-surface-2 px-4 text-[12px] font-medium tracking-tight text-accent transition-colors hover:bg-[#1c1c1c]"
            >
              <LayoutDashboard size={14} strokeWidth={1.75} aria-hidden="true" />
              Back to the dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpDown,
  Database,
  Gauge,
  GitBranch,
  Network,
  type LucideIcon,
} from "lucide-react";
import { RecentExperiments } from "@/components/RecentExperiments";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "The DSA Command Center dashboard: jump into sorting, data structures, trees, graphs and complexity, and reopen recent benchmark experiments.",
};

type Module = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const MODULES: Module[] = [
  {
    href: "/sorting",
    title: "Sorting & Searching",
    description:
      "Step through comparisons, swaps and merges with live counters and complexity cards.",
    icon: ArrowUpDown,
  },
  {
    href: "/data-structures",
    title: "Data Structures",
    description:
      "Push, pop, enqueue and insert on stacks, queues and linked lists, with every pointer redrawn per step.",
    icon: Database,
  },
  {
    href: "/trees",
    title: "Trees",
    description:
      "Binary search trees, traversals and heaps, drawn node by node.",
    icon: GitBranch,
  },
  {
    href: "/graphs",
    title: "Graphs",
    description:
      "BFS, DFS and shortest paths over adjacency lists and matrices.",
    icon: Network,
  },
  {
    href: "/complexity",
    title: "Complexity",
    description:
      "A recursion visualizer with live call stacks, plus a benchmark center measuring sorting and searching as n grows.",
    icon: Gauge,
  },
];

/** Every module on the dashboard is built; this is the single "Ready" chip. */
function ReadyBadge() {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-sorted/50 bg-surface-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-sorted">
      <span className="h-1.5 w-1.5 rounded-full bg-sorted" aria-hidden="true" />
      Ready
    </span>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="label">CS 214 · Overview</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-ink">
            DSA Command Center
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            An interactive visual lab: every algorithm runs as a pure function
            that emits its steps up front, and the interface plays them back one
            index at a time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/sorting"
            className="flex h-10 items-center gap-2 rounded-md border border-accent/60 bg-surface-2 px-4 text-[12px] font-medium tracking-tight text-accent transition-colors hover:bg-[#1c1c1c]"
          >
            Open Sorting Lab
            <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link
            href="/about"
            className="flex h-10 items-center rounded-md border border-line bg-surface px-4 text-[12px] font-medium tracking-tight text-ink-muted transition-colors hover:text-ink"
          >
            About the project
          </Link>
        </div>
      </section>

      <section aria-labelledby="modules-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="modules-heading" className="label">
            Modules
          </h2>
          <span className="font-mono text-[11px] text-ink-muted">
            5 modules ready
          </span>
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <li key={module.href}>
                <Link
                  href={module.href}
                  className="panel group flex h-full flex-col gap-3 p-5 transition-colors hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface-2 text-ink-muted transition-colors group-hover:text-accent">
                      <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <ReadyBadge />
                  </div>
                  <h3 className="text-[15px] font-medium tracking-tight text-ink">
                    {module.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-ink-muted">
                    {module.description}
                  </p>
                  <span className="label mt-auto flex items-center gap-1.5 pt-1 transition-colors group-hover:text-ink">
                    Open
                    <ArrowRight size={12} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <RecentExperiments variant="dashboard" />
    </div>
  );
}

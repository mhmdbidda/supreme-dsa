import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpDown,
  Database,
  Gauge,
  GitBranch,
  Network,
  Search,
  type LucideIcon,
} from "lucide-react";
import { HeroSortPreview } from "@/components/marketing/HeroSortPreview";

const DESCRIPTION =
  "An interactive lab for sorting, searching, data structures, trees, graphs and complexity, where every algorithm runs step by step with real operation counters.";

export const metadata: Metadata = {
  title: { absolute: "DSA Command Center — interactive visual lab" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "DSA Command Center",
    title: "DSA Command Center — interactive visual lab",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "DSA Command Center — interactive visual lab",
    description: DESCRIPTION,
  },
};

type Module = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

/**
 * The six real modules, one honest line each — every claim below maps to a
 * feature that exists in the codebase today (no heaps, no shortest-path
 * algorithms, nothing "coming soon").
 */
const MODULES: Module[] = [
  {
    href: "/sorting",
    title: "Sorting",
    description:
      "Bubble sort and merge sort played back frame by frame, with live comparison, swap and write counters.",
    icon: ArrowUpDown,
  },
  {
    href: "/sorting",
    title: "Searching",
    description:
      "Linear and binary search inside the Sorting Lab: every probe highlighted, with the comparisons each probe costs.",
    icon: Search,
  },
  {
    href: "/data-structures",
    title: "Data Structures",
    description:
      "Stack, queue and singly linked list, drawn pointer by pointer as you push, pop and enqueue.",
    icon: Database,
  },
  {
    href: "/trees",
    title: "Trees",
    description:
      "A binary search tree with insert, search and delete, plus inorder, preorder and postorder traversals.",
    icon: GitBranch,
  },
  {
    href: "/graphs",
    title: "Graphs",
    description:
      "An SVG graph editor with BFS and DFS playback over adjacency lists and matrices.",
    icon: Network,
  },
  {
    href: "/complexity",
    title: "Complexity Lab",
    description:
      "A recursion visualizer with live call stacks, plus a seeded benchmark center for sorting and searching.",
    icon: Gauge,
  },
];

const STEPS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Algorithms generate every step",
    body: "Each algorithm is a pure TypeScript function that copies its input and returns the whole step stream up front — frames, highlights and counters.",
  },
  {
    title: "The UI plays them back",
    body: "The interface only holds an index over that recorded stream, so playing, pausing and scrubbing backwards are all exact.",
  },
  {
    title: "Counters show what actually happened",
    body: "Comparisons, swaps and writes are read from the recorded frames, so the numbers are deterministic — never stopwatch guesses.",
  },
];

/**
 * Landing page (`/`): the marketing entry point. It lives in the
 * `(marketing)` route group, so it renders without the sidebar / AppShell —
 * only the shared root palette, grain overlay and skip link.
 */
export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-10 sm:space-y-16 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
        <section aria-labelledby="hero-heading">
          <p className="label">CS 214 · Interactive lab</p>
          <h1
            id="hero-heading"
            className="mt-4 text-3xl font-medium leading-tight tracking-tight text-ink sm:text-4xl lg:text-[42px]"
          >
            Run every algorithm, one step at a time.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted sm:text-[15px]">
            {DESCRIPTION}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/sorting"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-[13px] font-medium tracking-tight text-[#0a0a0a] transition-colors hover:bg-[#f7c466]"
            >
              Open the Sorting Lab
              <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center rounded-md border border-line bg-surface px-5 text-[13px] font-medium tracking-tight text-ink-muted transition-colors hover:border-white/20 hover:text-ink"
            >
              Browse all modules
            </Link>
          </div>
        </section>

        <HeroSortPreview />
      </div>

      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="label">
          Modules
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <li key={module.title}>
                <Link
                  href={module.href}
                  className="panel group flex h-full flex-col gap-3 p-5 transition-colors hover:border-white/20"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface-2 text-ink-muted transition-colors group-hover:text-accent">
                    <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
                  </span>
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

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="label">
          How it works
        </h2>
        <ol className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="panel p-5">
              <span
                aria-hidden="true"
                className="font-mono text-[11px] tracking-widest text-accent"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 text-[15px] font-medium tracking-tight text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="built-heading" className="panel p-5 sm:p-6">
        <h2 id="built-heading" className="label">
          Built with
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Next.js, TypeScript, Tailwind CSS and Vitest — no backend, no
          accounts, no third-party assets.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
          A note on timings: wall-clock measurements in the Complexity Lab are
          indicative only — they never prove Big-O. The operation counters are
          the exact, deterministic numbers.
        </p>
      </section>
    </div>
  );
}

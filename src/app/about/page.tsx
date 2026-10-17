import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "What the DSA Command Center is for, how the generate-then-play-back step model works, the module list, tech stack, setup and testing approach.",
};

const MODULES: ReadonlyArray<{ href: string; name: string; note: string }> = [
  {
    href: "/sorting",
    name: "Sorting & Searching",
    note: "Bubble and merge sort, linear and binary search, with live comparisons, swaps and merges.",
  },
  {
    href: "/data-structures",
    name: "Data Structures",
    note: "Stack, queue and singly linked list drawn pointer by pointer.",
  },
  {
    href: "/trees",
    name: "Trees",
    note: "A binary search tree with insert, search, delete and all three traversals.",
  },
  {
    href: "/graphs",
    name: "Graphs",
    note: "An SVG graph editor with BFS and DFS over adjacency lists and matrices.",
  },
  {
    href: "/complexity",
    name: "Complexity",
    note: "A recursion visualizer with live call stacks, plus a seeded benchmark center.",
  },
];

const STACK: ReadonlyArray<{ name: string; note: string }> = [
  { name: "Next.js 15 (App Router)", note: "Static routes, per-route metadata." },
  { name: "React 19", note: "Client labs on top of server-rendered pages." },
  { name: "TypeScript (strict)", note: "No unused locals or parameters." },
  { name: "Tailwind CSS v4", note: "Design tokens declared in globals.css, not a config file." },
  { name: "Recharts", note: "Benchmark growth curves only." },
  { name: "Vitest", note: "Pure-logic unit tests, Node environment." },
];

/**
 * Static About page: what the lab is, the architecture rule every module
 * follows, how to run it, and how it is tested. No interactive content.
 */
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="label">CS 214 · About</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-ink">
          About the DSA Command Center
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          An interactive visual lab for Data Structures and Algorithms. Every
          algorithm runs as a pure function that emits its whole step stream up
          front; the interface then only plays that stream back one index at a
          time. Nothing here is a black box — the counters and the drawing are
          both derived from the same recorded steps.
        </p>
      </header>

      <section className="panel p-6 sm:p-8" aria-labelledby="model-heading">
        <h2 id="model-heading" className="label">
          The step model
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink-muted">
          <p>
            The rule that shapes the whole codebase: algorithms are pure
            TypeScript. They take an input, copy it (never mutating the
            caller&apos;s array or object), and return{" "}
            <code className="font-mono text-[13px] text-ink">
              {"{ result, steps, counters }"}
            </code>
            .
          </p>
          <p>
            Each entry in <span className="font-mono text-[13px] text-ink">steps</span>{" "}
            is an immutable snapshot describing one frame — the array, the
            highlighted indices, the current node, the pointers. Components hold
            a single current-step index from{" "}
            <span className="font-mono text-[13px] text-ink">usePlayback</span> and
            render whatever that step contains. Because history is never
            rewritten in place, scrubbing backwards is exact.
          </p>
          <p>
            That separation is also why the labs share one set of playback
            controls, one bar chart, and one inspector: they all consume the same
            shape of step stream, whether it came from a sort, a traversal, or a
            recursive call.
          </p>
        </div>
      </section>

      <section className="panel p-6 sm:p-8" aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="label">
          Modules
        </h2>
        <ul className="mt-4 space-y-3">
          {MODULES.map((module) => (
            <li key={module.href}>
              <Link
                href={module.href}
                className="group flex items-start gap-3 rounded-md border border-line bg-surface-2 px-4 py-3 transition-colors hover:border-white/20"
              >
                <ArrowRight
                  size={14}
                  strokeWidth={1.75}
                  className="mt-1 shrink-0 text-accent"
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium tracking-tight text-ink">
                    {module.name}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-muted">
                    {module.note}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-6 sm:p-8" aria-labelledby="stack-heading">
        <h2 id="stack-heading" className="label">
          Tech stack
        </h2>
        <dl className="mt-4 space-y-3">
          {STACK.map((entry) => (
            <div
              key={entry.name}
              className="flex flex-col gap-1 border-b border-line pb-3 last:border-none last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <dt className="text-[13px] font-medium tracking-tight text-ink">
                {entry.name}
              </dt>
              <dd className="text-[12px] leading-relaxed text-ink-muted sm:text-right">
                {entry.note}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel p-6 sm:p-8" aria-labelledby="run-heading">
        <h2 id="run-heading" className="label">
          Run it locally
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          The project needs Node 20 (see{" "}
          <span className="font-mono text-[13px] text-ink">.nvmrc</span>). Install
          once, then start the dev server:
        </p>
        <pre
          tabIndex={0}
          role="group"
          aria-label="Installation and development commands - scroll horizontally"
          className="mt-4 overflow-x-auto rounded-md border border-line bg-surface-2 p-4 font-mono text-[12px] leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-1 focus:ring-offset-surface"
        >
{`npm install
npm run dev        # http://localhost:3000

npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest
npm run build      # production build
npm run check      # all of the above, in order`}
        </pre>
      </section>

      <section className="panel p-6 sm:p-8" aria-labelledby="testing-heading">
        <h2 id="testing-heading" className="label">
          Testing
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink-muted">
          <p>
            The Vitest suite targets the pure layer: the algorithm engines and
            the playback reducer. It asserts the step contract each UI module
            relies on — steps start from the untouched input, end on the finished
            result, never mutate their input, and report the counters they
            promise. Playback bounds are covered directly, without a DOM.
          </p>
          <p>
            The interactive layer is verified by hand. A full README lives at the
            repository root, and the exact counter definitions per algorithm are
            in{" "}
            <span className="font-mono text-[13px] text-ink">docs/COUNTERS.md</span>.
          </p>
        </div>
      </section>
    </div>
  );
}

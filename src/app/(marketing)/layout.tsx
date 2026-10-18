import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GITHUB_URL } from "@/lib/site";

/**
 * Marketing shell for the landing page: banner, main and footer, with no
 * sidebar and no AppShell. The root layout still owns `<html>` / `<body>`,
 * the skip link and the grain overlay, so `/` shares the app's exact
 * palette and texture — only the chrome around the content is lighter.
 */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-10">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md py-1.5 text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0 text-accent"
              aria-hidden="true"
              focusable="false"
              fill="currentColor"
            >
              <rect x="3" y="13" width="4.5" height="8" rx="1" />
              <rect x="9.75" y="8" width="4.5" height="13" rx="1" opacity="0.75" />
              <rect x="16.5" y="3" width="4.5" height="18" rx="1" opacity="0.5" />
            </svg>
            <span className="text-[15px] font-medium tracking-tight">
              DSA Command Center
            </span>
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/dashboard"
              className="inline-flex min-h-9 items-center rounded-md px-3 py-1.5 text-[13px] tracking-tight text-ink-muted transition-colors hover:text-ink"
            >
              Dashboard
            </Link>
            <Link
              href="/about"
              className="inline-flex min-h-9 items-center rounded-md px-3 py-1.5 text-[13px] tracking-tight text-ink-muted transition-colors hover:text-ink"
            >
              About
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium tracking-tight text-[#0a0a0a] transition-colors hover:bg-[#f7c466]"
            >
              Launch
              <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <div className="flex flex-col gap-1">
            <p className="text-[12px] leading-relaxed text-ink-muted">
              CS 214 · Runs entirely in the browser — no backend, no accounts.
            </p>
            <p className="text-[12px] leading-relaxed text-ink-muted">
              © 2026 Mohamed Bilal. All rights reserved.
            </p>
          </div>
          <a
            href={GITHUB_URL}
            className="inline-flex w-fit items-center gap-1.5 rounded-sm text-[13px] tracking-tight text-ink-muted transition-colors hover:text-ink"
          >
            GitHub
            <ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" />
          </a>
        </div>
      </footer>
    </div>
  );
}

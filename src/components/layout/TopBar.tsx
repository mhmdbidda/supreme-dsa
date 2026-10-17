"use client";

import { Menu } from "lucide-react";
import { type RefObject } from "react";

type TopBarProps = {
  title: string;
  path: string;
  menuOpen: boolean;
  onOpenMenu: () => void;
  toggleRef?: RefObject<HTMLButtonElement | null>;
};

export function TopBar({ title, path, menuOpen, onOpenMenu, toggleRef }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/95 px-4 backdrop-blur-sm sm:px-6">
      <button
        ref={toggleRef}
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation menu"
        aria-expanded={menuOpen}
        aria-controls="sidebar"
        className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface-2 text-ink-muted transition-colors hover:text-ink lg:hidden"
      >
        <Menu size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <div className="flex min-w-0 items-baseline gap-3">
        <p className="truncate text-sm font-medium tracking-tight text-ink">
          {title}
        </p>
        <span className="hidden truncate font-mono text-[11px] text-ink-muted sm:inline">
          {path}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
          Prototype
        </span>
      </div>
    </header>
  );
}

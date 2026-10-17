"use client";

import {
  ArrowUpDown,
  Database,
  Gauge,
  GitBranch,
  Info,
  LayoutDashboard,
  Network,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sorting", label: "Sorting", icon: ArrowUpDown },
  { href: "/data-structures", label: "Data Structures", icon: Database },
  { href: "/trees", label: "Trees", icon: GitBranch },
  { href: "/graphs", label: "Graphs", icon: Network },
  { href: "/complexity", label: "Complexity", icon: Gauge },
  { href: "/about", label: "About", icon: Info },
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile drawer backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/70 lg:hidden",
          open ? "block" : "hidden",
        )}
      />

      <aside
        id="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-line px-5">
          <Link href="/" className="flex flex-col gap-0.5" onClick={onClose}>
            <span className="label">CS 214 · Visual Lab</span>
            <span className="text-[15px] font-medium tracking-tight text-ink">
              DSA Command Center
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface-2 text-ink-muted transition-colors hover:text-ink lg:hidden"
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-3 rounded-md border-l-2 px-3 py-2 text-[13px] tracking-tight transition-colors",
                  active
                    ? "border-accent bg-surface-2 text-ink"
                    : "border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <Icon
                  size={16}
                  strokeWidth={1.75}
                  className={active ? "text-accent" : "text-ink-muted"}
                  aria-hidden="true"
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line px-5 py-4">
          <p className="font-mono text-[10px] leading-relaxed tracking-wide text-ink-muted">
            Runs entirely in the browser.
            <br />
            No backend, no accounts.
          </p>
        </div>
      </aside>
    </>
  );
}

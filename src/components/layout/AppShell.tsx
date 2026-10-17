"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/sorting": "Sorting & Searching",
  "/data-structures": "Data Structures",
  "/trees": "Trees",
  "/graphs": "Graphs",
  "/complexity": "Complexity",
  "/about": "About",
};

/**
 * Shared shell: collapsible sidebar (drawer on mobile), compact top bar and
 * the persistent grain overlay lives in the root layout.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstFocusRef = useRef<HTMLElement>(null);

  // Navigating always closes the mobile drawer.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape closes the drawer and trap focus when open.
  useEffect(() => {
    if (!menuOpen) return;
    const toggle = toggleRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key === "Tab") {
        const focusable = Array.from(
          document.querySelectorAll<HTMLElement>(
            "#sidebar [href], #sidebar button, #sidebar [tabindex]:not([tabindex='-1'])",
          ),
        ).filter((el) => !el.hasAttribute("disabled") && el.offsetWidth > 0 && el.offsetHeight > 0);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first || !focusable.includes(document.activeElement as HTMLElement)) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        "#sidebar [href], #sidebar button, #sidebar [tabindex]:not([tabindex='-1'])",
      ),
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetWidth > 0 && el.offsetHeight > 0);
    if (focusable.length > 0) {
      firstFocusRef.current = focusable[0];
      setTimeout(() => firstFocusRef.current?.focus(), 50);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      toggle?.focus();
    };
  }, [menuOpen]);

  const title = TITLES[pathname] ?? "DSA Command Center";

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-64">
        <TopBar
          title={title}
          path={pathname}
          menuOpen={menuOpen}
          onOpenMenu={() => setMenuOpen(true)}
          toggleRef={toggleRef}
        />
        <main id="main" className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

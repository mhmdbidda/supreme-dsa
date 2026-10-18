import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Every route except the landing page renders inside the existing shell:
 * collapsible sidebar, top bar, `main#main` container. The landing page
 * lives in the sibling `(marketing)` group with its own minimal layout.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}

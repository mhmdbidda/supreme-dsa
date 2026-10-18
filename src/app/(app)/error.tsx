"use client";

import { RouteError } from "@/components/layout/RouteError";

/**
 * Error boundary for everything inside the app shell. It renders inside
 * `(app)/layout` (the AppShell already provides `main#main`), so the sidebar
 * and top bar stay visible while the failed segment is replaced.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} />;
}

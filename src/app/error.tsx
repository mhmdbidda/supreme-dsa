"use client";

import { RouteError } from "@/components/layout/RouteError";

/**
 * Root error boundary. It catches errors from every segment — including the
 * landing page, which renders in the root layout without the AppShell — so it
 * provides its own `main#main` for the root layout's skip link.
 *
 * Errors thrown inside the `(app)` group are caught closer to the source by
 * `app/(app)/error.tsx`, which keeps the sidebar visible.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10"
    >
      <RouteError error={error} reset={reset} />
    </main>
  );
}

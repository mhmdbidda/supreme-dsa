"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Tracks the user's `prefers-reduced-motion` setting.
 *
 * Returns `false` for the first render (and on the server) so JS-driven
 * animation stays off until we know the user's preference, then follows the
 * media query live. Use it to gate animation that CSS alone cannot reach,
 * such as the Recharts line animation in the Benchmark Center.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia(QUERY);
    setPrefersReduced(media.matches);
    const listener = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return prefersReduced;
}

"use client";

import { useEffect, useState } from "react";

const QUERY = "(min-width:1024px)";

/**
 * Tracks whether the viewport is at least the `lg` breakpoint (1024px).
 *
 * Defaults to `true` on the server and for the very first client render so
 * server-rendered markup assumes a desktop viewport: the desktop sidebar must
 * never be inert or carry dialog semantics, and hydration stays consistent
 * because both sides render the same attributes. Once mounted, the real
 * breakpoint is measured and followed live.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia(QUERY);
    setIsDesktop(media.matches);
    const listener = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return isDesktop;
}

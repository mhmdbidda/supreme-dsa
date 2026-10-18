/**
 * Pure data and helpers for the landing page's live hero preview
 * (`src/components/marketing/HeroSortPreview.tsx`).
 *
 * The preview never fabricates its frames: the component runs
 * `HERO_SORT_INPUT` through the real `bubbleSort` engine in
 * `src/algorithms/sorting` and only animates the recorded step stream.
 */

/**
 * Fixed input for the hero animation. The array is constant (never random)
 * so every load replays exactly the same step stream, and it is deliberately
 * part-out-of-order so the loop shows real swaps without taking forever to
 * complete one cycle.
 */
export const HERO_SORT_INPUT: readonly number[] = [
  42, 17, 96, 5, 63, 28, 71, 12, 55, 34,
];

/**
 * Next frame of the looping preview: one step forward, wrapping from the
 * last frame back to the first so the animation loops forever.
 *
 * Defensive by design — an unusable stream (fewer than two frames) or an
 * unusable index (NaN, negative, infinite) falls back to frame 0 instead of
 * producing `NaN`, which would poison the render.
 */
export function nextHeroFrame(index: number, total: number): number {
  if (!Number.isFinite(total)) return 0;
  const size = Math.trunc(total);
  if (size < 2) return 0;
  const current = Number.isFinite(index) && index >= 0 ? Math.trunc(index) : 0;
  return (current + 1) % size;
}

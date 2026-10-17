export const MIN_ARRAY_SIZE = 5;
export const MAX_ARRAY_SIZE = 60;

/** Tiny class-name joiner: filters out falsey values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/** Random integers in [1, 99]; deterministic per call, never mutates state. */
export function randomArray(size: number): number[] {
  const length = Math.trunc(clamp(size, MIN_ARRAY_SIZE, MAX_ARRAY_SIZE));
  return Array.from({ length }, () => Math.floor(Math.random() * 99) + 1);
}

export type ParseResult =
  | { ok: true; values: number[] }
  | { ok: false; error: string };

const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Parses a comma-separated list such as "12, 4, -7, 9.5".
 * Rules: numbers only, at most MAX_ARRAY_SIZE items, nothing else.
 */
export function parseNumberList(input: string, maxItems = MAX_ARRAY_SIZE): ParseResult {
  const trimmed = input.trim();
  if (trimmed === "") {
    return { ok: false, error: "Enter at least one number, e.g. 12, 4, 7." };
  }

  const tokens = trimmed.split(",").map((token) => token.trim());

  if (tokens.some((token) => token === "")) {
    return { ok: false, error: "Remove the extra comma — separate numbers with commas only." };
  }

  if (tokens.some((token) => !NUMBER_PATTERN.test(token))) {
    return { ok: false, error: "Numbers only, separated by commas (e.g. 12, -4, 7)." };
  }

  if (tokens.length > maxItems) {
    return { ok: false, error: `Maximum of ${maxItems} items — you entered ${tokens.length}.` };
  }

  return { ok: true, values: tokens.map((token) => Number(token)) };
}

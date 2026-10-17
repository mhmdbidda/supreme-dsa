import { useCallback, useEffect, useReducer } from "react";

/**
 * Generic playback engine for "generate every step, then play them back".
 *
 * The UI never mutates the step list; it only moves an index inside
 * `[0, totalSteps - 1]`. The reducer is exported as pure logic so the bounds
 * and reset rules can be unit-tested without a DOM.
 *
 * `speed` is expressed in steps per second.
 */

export type PlaybackState = {
  index: number;
  playing: boolean;
  speed: number;
};

export type PlaybackAction =
  | { type: "play"; total: number }
  | { type: "pause" }
  | { type: "toggle"; total: number }
  | { type: "next"; total: number }
  | { type: "prev"; total: number }
  | { type: "tick"; total: number }
  | { type: "reset" }
  | { type: "setSpeed"; speed: number };

export const MIN_SPEED = 1;
export const MAX_SPEED = 15;
export const DEFAULT_SPEED = 6;

/**
 * The only thing this app stores: the playback speed preference, in
 * localStorage. Everything else is ephemeral (no backend, no history).
 */
const SPEED_STORAGE_KEY = "dsa-playback-speed";

function readStoredSpeed(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SPEED_STORAGE_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    // Storage blocked (private mode, disabled cookies) — fall back to default.
    return null;
  }
}

/** Keeps the index inside [0, total - 1]; an empty list always maps to 0. */
export function clampIndex(index: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  // NaN is meaningless here and would poison Math.min/max, so treat it as 0.
  const safeIndex = Number.isNaN(index) ? 0 : Math.trunc(index);
  return Math.min(Math.max(safeIndex, 0), total - 1);
}

export const initialPlaybackState: PlaybackState = {
  index: 0,
  playing: false,
  speed: DEFAULT_SPEED,
};

export function playbackReducer(
  state: PlaybackState,
  action: PlaybackAction,
): PlaybackState {
  switch (action.type) {
    case "play": {
      // Playing is only meaningful while there is a next step to show.
      if (action.total <= 0) return state;
      if (clampIndex(state.index, action.total) >= action.total - 1) return state;
      return { ...state, playing: true };
    }
    case "pause":
      return state.playing ? { ...state, playing: false } : state;
    case "toggle": {
      if (!state.playing) return playbackReducer(state, { type: "play", total: action.total });
      return { ...state, playing: false };
    }
    case "next":
      return { ...state, index: clampIndex(state.index + 1, action.total) };
    case "prev":
      return { ...state, index: clampIndex(state.index - 1, action.total) };
    case "tick": {
      const index = clampIndex(state.index, action.total);
      // Last step reached: hold the index and stop autoplay.
      if (index >= action.total - 1) return { ...state, index, playing: false };
      return { ...state, index: index + 1 };
    }
    case "reset":
      // Reset restores the initial playback state (index 0, paused).
      // Speed is a user preference, so it is intentionally preserved.
      return { ...state, index: 0, playing: false };
    case "setSpeed":
      return {
        ...state,
        speed: Math.min(
          Math.max(Math.trunc(action.speed), MIN_SPEED),
          MAX_SPEED,
        ),
      };
    default:
      return state;
  }
}

/**
 * Plays back a generated list of steps.
 * - the index can never leave `[0, steps.length - 1]`,
 * - any change to the step list (new array, new algorithm) resets playback,
 * - autoplay stops automatically on the last step.
 */
export function usePlayback<T>(steps: readonly T[]) {
  const totalSteps = steps.length;
  const [state, dispatch] = useReducer(playbackReducer, initialPlaybackState);

  // New step list => back to the initial state.
  useEffect(() => {
    dispatch({ type: "reset" });
  }, [steps]);

  // Load the stored speed preference after hydration, so the first client
  // render matches the server-rendered markup.
  useEffect(() => {
    const stored = readStoredSpeed();
    if (stored !== null) dispatch({ type: "setSpeed", speed: stored });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SPEED_STORAGE_KEY, String(state.speed));
    } catch {
      // Ignore storage failures — the speed still applies for this session.
    }
  }, [state.speed]);

  // One scheduled tick per displayed step, so speed stays accurate.
  useEffect(() => {
    if (!state.playing) return;
    if (totalSteps <= 0) {
      dispatch({ type: "pause" });
      return;
    }
    const timer = setTimeout(
      () => dispatch({ type: "tick", total: totalSteps }),
      1000 / state.speed,
    );
    return () => clearTimeout(timer);
  }, [state.playing, state.index, state.speed, totalSteps]);

  const index = clampIndex(state.index, totalSteps);

  const play = useCallback(() => dispatch({ type: "play", total: totalSteps }), [totalSteps]);
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  const toggle = useCallback(
    () => dispatch({ type: "toggle", total: totalSteps }),
    [totalSteps],
  );
  const next = useCallback(
    () => dispatch({ type: "next", total: totalSteps }),
    [totalSteps],
  );
  const previous = useCallback(
    () => dispatch({ type: "prev", total: totalSteps }),
    [totalSteps],
  );
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const setSpeed = useCallback(
    (speed: number) => dispatch({ type: "setSpeed", speed }),
    [],
  );

  return {
    index,
    totalSteps,
    playing: state.playing,
    speed: state.speed,
    atStart: index === 0,
    atEnd: totalSteps === 0 || index === totalSteps - 1,
    play,
    pause,
    toggle,
    next,
    previous,
    reset,
    setSpeed,
  };
}

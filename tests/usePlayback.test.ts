import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPEED,
  MAX_SPEED,
  MIN_SPEED,
  clampIndex,
  initialPlaybackState,
  playbackReducer,
  type PlaybackState,
} from "../src/hooks/usePlayback";

const TOTAL = 5;

function run(state: PlaybackState, actions: Parameters<typeof playbackReducer>[1][]) {
  return actions.reduce(playbackReducer, state);
}

describe("clampIndex", () => {
  it("keeps the index inside [0, total - 1]", () => {
    expect(clampIndex(-3, TOTAL)).toBe(0);
    expect(clampIndex(0, TOTAL)).toBe(0);
    expect(clampIndex(2, TOTAL)).toBe(2);
    expect(clampIndex(4, TOTAL)).toBe(4);
    expect(clampIndex(99, TOTAL)).toBe(TOTAL - 1);
  });

  it("maps an empty step list to index 0", () => {
    expect(clampIndex(0, 0)).toBe(0);
    expect(clampIndex(7, 0)).toBe(0);
    expect(clampIndex(7, -5)).toBe(0);
  });

  it("sanitises non-integer and non-finite input", () => {
    expect(clampIndex(2.9, TOTAL)).toBe(2);
    expect(clampIndex(Number.NaN, TOTAL)).toBe(0);
    expect(clampIndex(Number.POSITIVE_INFINITY, TOTAL)).toBe(TOTAL - 1);
  });
});

describe("playbackReducer", () => {
  it("starts from the initial state", () => {
    expect(initialPlaybackState.index).toBe(0);
    expect(initialPlaybackState.playing).toBe(false);
    expect(initialPlaybackState.speed).toBe(DEFAULT_SPEED);
  });

  it("moves one step at a time and never past the last step", () => {
    const state = run(initialPlaybackState, [
      { type: "next", total: TOTAL },
      { type: "next", total: TOTAL },
      { type: "next", total: TOTAL },
      { type: "next", total: TOTAL },
      { type: "next", total: TOTAL },
      { type: "next", total: TOTAL },
      { type: "next", total: TOTAL },
    ]);
    expect(state.index).toBe(TOTAL - 1);
  });

  it("never moves before the first step", () => {
    const state = run({ ...initialPlaybackState, index: 2 }, [
      { type: "prev", total: TOTAL },
      { type: "prev", total: TOTAL },
      { type: "prev", total: TOTAL },
    ]);
    expect(state.index).toBe(0);
  });

  it("clamps next and prev against an empty step list", () => {
    const state = run(initialPlaybackState, [
      { type: "next", total: 0 },
      { type: "prev", total: 0 },
    ]);
    expect(state.index).toBe(0);
    expect(state.playing).toBe(false);
  });

  it("stops autoplay on the last tick", () => {
    const state = run({ ...initialPlaybackState, index: TOTAL - 1, playing: true }, [
      { type: "tick", total: TOTAL },
    ]);
    expect(state.index).toBe(TOTAL - 1);
    expect(state.playing).toBe(false);
  });

  it("ticks forward while steps remain", () => {
    const state = run({ ...initialPlaybackState, playing: true }, [
      { type: "tick", total: TOTAL },
      { type: "tick", total: TOTAL },
    ]);
    expect(state.index).toBe(2);
    expect(state.playing).toBe(true);
  });

  it("reset restores the initial state (index 0, paused) and keeps the speed preference", () => {
    const before = run({ ...initialPlaybackState, speed: 9 }, [
      { type: "next", total: TOTAL },
      { type: "next", total: TOTAL },
      { type: "play", total: TOTAL },
    ]);
    expect(before.index).toBe(2);
    expect(before.playing).toBe(true);

    const after = playbackReducer(before, { type: "reset" });
    expect(after.index).toBe(0);
    expect(after.playing).toBe(false);
    expect(after.speed).toBe(9);
  });

  it("restarts from step 0 when play is pressed on the last step", () => {
    const atEnd = { ...initialPlaybackState, index: TOTAL - 1 };

    const restarted = playbackReducer(atEnd, { type: "play", total: TOTAL });
    expect(restarted.index).toBe(0);
    expect(restarted.playing).toBe(true);

    // The play/pause toggle takes the same restart path.
    const toggled = playbackReducer(atEnd, { type: "toggle", total: TOTAL });
    expect(toggled.index).toBe(0);
    expect(toggled.playing).toBe(true);
  });

  it("does not play when there are no steps at all", () => {
    expect(
      playbackReducer({ ...initialPlaybackState }, { type: "play", total: 0 }).playing,
    ).toBe(false);
    expect(
      playbackReducer({ ...initialPlaybackState, index: 3 }, { type: "play", total: 0 })
        .index,
    ).toBe(3);
    expect(
      playbackReducer({ ...initialPlaybackState }, { type: "toggle", total: 0 }).playing,
    ).toBe(false);
  });

  it("toggles between play and pause", () => {
    const playing = playbackReducer(initialPlaybackState, {
      type: "toggle",
      total: TOTAL,
    });
    expect(playing.playing).toBe(true);

    const paused = playbackReducer(playing, { type: "toggle", total: TOTAL });
    expect(paused.playing).toBe(false);
  });

  it("clamps the speed into the supported range", () => {
    const fast = playbackReducer(initialPlaybackState, { type: "setSpeed", speed: 900 });
    expect(fast.speed).toBe(MAX_SPEED);

    const slow = playbackReducer(initialPlaybackState, { type: "setSpeed", speed: -50 });
    expect(slow.speed).toBe(MIN_SPEED);
  });
});

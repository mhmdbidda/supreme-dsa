"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { RangeControl } from "@/components/controls/RangeControl";
import { MAX_SPEED, MIN_SPEED } from "@/hooks/usePlayback";
import { cn } from "@/lib/utils";

type PlaybackControlsProps = {
  playing: boolean;
  atStart: boolean;
  atEnd: boolean;
  disabled: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
};

const BUTTON_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface-2 text-ink transition-colors hover:border-white/20 hover:bg-[#1c1c1c] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-surface-2";

/** Play / Pause / Next / Previous / Reset plus the speed slider. */
export function PlaybackControls({
  playing,
  atStart,
  atEnd,
  disabled,
  speed,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onReset,
  onSpeedChange,
}: PlaybackControlsProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2" role="group" aria-label="Playback controls">
        <button
          type="button"
          onClick={onPrevious}
          disabled={disabled || atStart}
          aria-label="Previous step"
          title="Previous step"
          className={BUTTON_CLASS}
        >
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={playing ? onPause : onPlay}
          disabled={disabled}
          aria-label={playing ? "Pause" : "Play"}
          title={playing ? "Pause" : "Play — restarts from the first step at the end"}
          className={cn(
            BUTTON_CLASS,
            "h-10 w-16 gap-2 border-accent/50 text-accent disabled:border-line disabled:text-ink",
          )}
        >
          {playing ? (
            <Pause size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Play size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
            {playing ? "Pause" : "Play"}
          </span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={disabled || atEnd}
          aria-label="Next step"
          title="Next step"
          className={BUTTON_CLASS}
        >
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          aria-label="Reset to the first step"
          title="Reset"
          className={BUTTON_CLASS}
        >
          <RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <div className="w-full sm:max-w-[260px]">
        <RangeControl
          id="speed"
          label="Speed"
          value={speed}
          min={MIN_SPEED}
          max={MAX_SPEED}
          valueText={`${speed} steps/s`}
          disabled={disabled}
          onChange={onSpeedChange}
        />
      </div>
    </div>
  );
}

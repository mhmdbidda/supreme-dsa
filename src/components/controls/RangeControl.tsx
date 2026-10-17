"use client";

type RangeControlProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Mono value shown next to the label, e.g. "12 / 60". */
  valueText: string;
  hint?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

/** Labelled range slider used for array size and playback speed. */
export function RangeControl({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  valueText,
  hint,
  disabled,
  onChange,
}: RangeControlProps) {
  return (
    <div className={disabled ? "opacity-60" : undefined}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="label">
          {label}
        </label>
        <span className="font-mono text-[11px] tracking-tight text-ink">
          {valueText}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2.5"
      />
      {hint ? (
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

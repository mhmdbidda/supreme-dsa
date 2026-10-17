import type {
  RecursionCounters,
  RecursionFrame,
  RecursionStep,
} from "./types";

/**
 * Internal step recorder shared by every function in this folder.
 *
 * It maintains the live frame stack of the simulated recursion and emits
 * one immutable `RecursionStep` per push (`enter`) and per pop (`exit`).
 * Every step deep-copies the stack, so playback can never rewrite history
 * (see the step contract in `types.ts`).
 *
 * This class is deliberately NOT exported from `index.ts`: callers use the
 * named recursion functions, and the tests assert the step contract from
 * the outside.
 */
export class RecursionRecorder {
  private frames: RecursionFrame[] = [];
  private steps: RecursionStep[] = [];
  private counters: RecursionCounters = { calls: 0, maxDepth: 0 };

  /** Pushes a frame and records the `call` step. */
  enter(
    fn: string,
    params: string,
    description: string,
    isBaseCase = false,
  ): void {
    this.frames.push({ fn, params });
    this.counters.calls += 1;
    this.counters.maxDepth = Math.max(this.counters.maxDepth, this.frames.length);

    const step: RecursionStep = {
      event: "call",
      fn,
      params,
      depth: this.frames.length,
      stack: this.copyStack(),
      description,
    };
    if (isBaseCase) step.isBaseCase = true;
    this.steps.push(step);
  }

  /** Pops the current frame and records the `return` step. */
  exit(returnValue: number | string, description: string): void {
    const frame = this.frames[this.frames.length - 1];
    const depth = this.frames.length;
    // Pop FIRST: the recorded stack shows what remains after this frame
    // leaves, which is what a call-stack panel displays after the pop.
    this.frames.pop();
    this.steps.push({
      event: "return",
      fn: frame.fn,
      params: frame.params,
      depth,
      returnValue,
      stack: this.copyStack(),
      description,
    });
  }

  /** The finished, immutable step stream. */
  toSteps(): RecursionStep[] {
    return this.steps;
  }

  /** Counters as of now (copy — the recorder keeps mutating its own). */
  snapshotCounters(): RecursionCounters {
    return { ...this.counters };
  }

  /** Deep copy: fresh frames array, fresh frame objects every time. */
  private copyStack(): RecursionFrame[] {
    return this.frames.map((frame) => ({ ...frame }));
  }
}

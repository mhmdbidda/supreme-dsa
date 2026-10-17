import type { DSCounters, DSOutcome, DSPointers, DSSnapshot } from "./types";

/** A hand-rolled stack node: a value plus a link to the node below it. */
class StackNode {
  constructor(
    readonly value: number,
    public next: StackNode | null,
  ) {}
}

/**
 * Stack (LIFO) over linked nodes — the head of the chain is the top.
 *
 * Snapshots list items BOTTOM → TOP, so `items[items.length - 1]` is the
 * top. Every operation is applied to the live structure and records its
 * own immutable step stream; the last step always equals `toArray()`.
 *
 * Push/pop only re-write the `top` pointer, which is why both are O(1).
 */
export class VisualStack {
  private top: StackNode | null = null;
  private count = 0;

  private steps: DSSnapshot[] = [];
  private counters: DSCounters = { nodesVisited: 0, pointerChanges: 0 };

  /** Bottom → top, i.e. index `size - 1` is the top of the stack. */
  toArray(): number[] {
    const items: number[] = [];
    for (let node = this.top; node !== null; node = node.next) {
      items.push(node.value);
    }
    return items.reverse();
  }

  /** Pushes a value on top of the stack. O(1). */
  push(value: number): DSOutcome {
    this.begin();
    const before = this.count;
    this.snapshot(
      before === 0
        ? `Push ${value}: the stack is empty, so the new node becomes both the bottom and the top.`
        : `Push ${value} on top of the current top (index ${before - 1}).`,
      before === 0 ? [] : [before - 1],
    );

    this.top = new StackNode(value, this.top);
    this.count += 1;
    this.counters.pointerChanges += 1;

    this.snapshot(
      `Pushed ${value} — the top pointer now references index ${this.count - 1} (${this.count} item${
        this.count === 1 ? "" : "s"
      } in the stack).`,
      [this.count - 1],
    );
    return this.finish(value);
  }

  /** Removes and returns the top value. O(1); underflow on empty. */
  pop(): DSOutcome {
    this.begin();
    if (this.top === null) {
      this.snapshot("Pop refused: the stack is empty (underflow).");
      return this.finish(null, "Stack underflow: cannot pop from an empty stack.");
    }

    const topIndex = this.count - 1;
    const value = this.top.value;
    this.snapshot(`Pop: removing the top value at index ${topIndex}.`, [topIndex]);

    this.top = this.top.next;
    this.count -= 1;
    this.counters.pointerChanges += 1;

    this.snapshot(
      this.count === 0
        ? `Popped ${value} — the stack is empty now.`
        : `Popped ${value} — the top pointer moved to index ${this.count - 1}.`,
      this.count === 0 ? [] : [this.count - 1],
    );
    return this.finish(value);
  }

  /** Reads the top value without removing it. O(1); underflow on empty. */
  peek(): DSOutcome {
    this.begin();
    if (this.top === null) {
      this.snapshot("Peek refused: the stack is empty (underflow).");
      return this.finish(null, "Stack underflow: cannot peek at an empty stack.");
    }

    this.counters.nodesVisited += 1;
    const value = this.top.value;
    this.snapshot(`Peek: the top value is ${value} at index ${this.count - 1}.`, [
      this.count - 1,
    ]);
    return this.finish(value);
  }

  /** Answers whether the stack holds no nodes. O(1). */
  isEmpty(): DSOutcome {
    this.begin();
    const empty = this.count === 0;
    this.snapshot(
      empty
        ? "isEmpty: the stack has no nodes."
        : `isEmpty: the stack holds ${this.count} item${this.count === 1 ? "" : "s"}, so it is not empty.`,
    );
    return this.finish(empty);
  }

  /** Returns how many items the stack holds. O(1). */
  size(): DSOutcome {
    this.begin();
    this.snapshot(
      `Size: the stack holds ${this.count} item${this.count === 1 ? "" : "s"}.`,
    );
    return this.finish(this.count);
  }

  /** Removes every item. O(n) to drop the nodes; returns how many were removed. */
  clear(): DSOutcome {
    this.begin();
    const removed = this.count;
    if (removed === 0) {
      this.snapshot("Clear: the stack is already empty.");
      return this.finish(0);
    }

    this.top = null;
    this.count = 0;
    this.counters.pointerChanges += 1;
    this.snapshot(
      `Cleared ${removed} item${removed === 1 ? "" : "s"} — the stack is empty now.`,
    );
    return this.finish(removed);
  }

  private begin(): void {
    // New array every time: previously returned snapshots are never touched.
    this.steps = [];
    this.counters = { nodesVisited: 0, pointerChanges: 0 };
  }

  private pointers(): DSPointers {
    return this.count === 0 ? {} : { top: this.count - 1 };
  }

  private snapshot(description: string, highlight: number[] = []): void {
    this.steps.push({
      items: this.toArray(),
      highlight: [...highlight],
      pointers: this.pointers(),
      description,
    });
  }

  private finish(
    result: DSOutcome["result"],
    error?: string,
  ): DSOutcome {
    return error === undefined
      ? { result, steps: this.steps, counters: this.counters }
      : { result, steps: this.steps, counters: this.counters, error };
  }
}

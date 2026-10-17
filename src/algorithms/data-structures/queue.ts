import type { DSCounters, DSOutcome, DSPointers, DSSnapshot } from "./types";

/** A hand-rolled queue node: a value plus a link to the node behind it. */
class QueueNode {
  constructor(
    readonly value: number,
    public next: QueueNode | null,
  ) {}
}

/**
 * Queue (FIFO) over linked nodes with explicit `front` and `rear` pointers.
 *
 * Snapshots list items FRONT → REAR, so `items[0]` leaves first and
 * `items[items.length - 1]` is the most recently enqueued node.
 *
 * Enqueue only re-writes the rear link and the rear pointer, dequeue only
 * moves the front pointer — both O(1), which is the whole point of keeping
 * two pointers instead of walking the chain.
 */
export class VisualQueue {
  private frontNode: QueueNode | null = null;
  private rearNode: QueueNode | null = null;
  private count = 0;

  private steps: DSSnapshot[] = [];
  private counters: DSCounters = { nodesVisited: 0, pointerChanges: 0 };

  /** Front → rear, i.e. index 0 is dequeued first. */
  toArray(): number[] {
    const items: number[] = [];
    for (let node = this.frontNode; node !== null; node = node.next) {
      items.push(node.value);
    }
    return items;
  }

  /** Adds a value behind the rear node. O(1). */
  enqueue(value: number): DSOutcome {
    this.begin();
    const before = this.count;
    this.snapshot(
      before === 0
        ? `Enqueue ${value}: the queue is empty, so the new node becomes both the front and the rear node.`
        : `Enqueue ${value} behind the rear node (index ${before - 1}).`,
      before === 0 ? [] : [before - 1],
    );

    const node = new QueueNode(value, null);
    if (this.rearNode === null) {
      this.frontNode = node;
      this.rearNode = node;
      this.counters.pointerChanges += 2; // front + rear
    } else {
      this.rearNode.next = node;
      this.rearNode = node;
      this.counters.pointerChanges += 2; // rear link + rear pointer
    }
    this.count += 1;

    this.snapshot(
      `Enqueued ${value} — the rear pointer now references index ${this.count - 1}.`,
      [this.count - 1],
    );
    return this.finish(value);
  }

  /** Removes and returns the front value. O(1); underflow on empty. */
  dequeue(): DSOutcome {
    this.begin();
    if (this.frontNode === null) {
      this.snapshot("Dequeue refused: the queue is empty (underflow).");
      return this.finish(
        null,
        "Queue underflow: cannot dequeue from an empty queue.",
      );
    }

    const value = this.frontNode.value;
    this.snapshot("Dequeue: removing the front value at index 0.", [0]);

    this.frontNode = this.frontNode.next;
    this.count -= 1;
    this.counters.pointerChanges += 1; // front pointer
    if (this.frontNode === null) {
      this.rearNode = null;
      this.counters.pointerChanges += 1; // rear pointer follows the front
    }

    const nextFront = this.frontNode;
    this.snapshot(
      nextFront === null
        ? `Dequeued ${value} — the queue is empty now.`
        : `Dequeued ${value} — the front pointer still references index 0, now holding ${nextFront.value}.`,
      nextFront === null ? [] : [0],
    );
    return this.finish(value);
  }

  /** Reads the front value without removing it. O(1); underflow on empty. */
  front(): DSOutcome {
    this.begin();
    if (this.frontNode === null) {
      this.snapshot("Front refused: the queue is empty (underflow).");
      return this.finish(
        null,
        "Queue underflow: cannot read the front of an empty queue.",
      );
    }

    this.counters.nodesVisited += 1;
    const value = this.frontNode.value;
    this.snapshot(`Front: the front value is ${value} at index 0.`, [0]);
    return this.finish(value);
  }

  /** Answers whether the queue holds no nodes. O(1). */
  isEmpty(): DSOutcome {
    this.begin();
    const empty = this.count === 0;
    this.snapshot(
      empty
        ? "isEmpty: the queue has no nodes."
        : `isEmpty: the queue holds ${this.count} node${this.count === 1 ? "" : "s"}, so it is not empty.`,
    );
    return this.finish(empty);
  }

  /** Returns how many nodes the queue holds. O(1). */
  size(): DSOutcome {
    this.begin();
    this.snapshot(
      `Size: the queue holds ${this.count} node${this.count === 1 ? "" : "s"}.`,
    );
    return this.finish(this.count);
  }

  /** Removes every node. O(n) to drop them; returns how many were removed. */
  clear(): DSOutcome {
    this.begin();
    const removed = this.count;
    if (removed === 0) {
      this.snapshot("Clear: the queue is already empty.");
      return this.finish(0);
    }

    this.frontNode = null;
    this.rearNode = null;
    this.count = 0;
    this.counters.pointerChanges += 2;
    this.snapshot(
      `Cleared ${removed} node${removed === 1 ? "" : "s"} — the queue is empty now.`,
    );
    return this.finish(removed);
  }

  private begin(): void {
    // New array every time: previously returned snapshots are never touched.
    this.steps = [];
    this.counters = { nodesVisited: 0, pointerChanges: 0 };
  }

  private pointers(): DSPointers {
    return this.count === 0 ? {} : { front: 0, rear: this.count - 1 };
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

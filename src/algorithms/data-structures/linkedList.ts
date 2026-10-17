import type { DSCounters, DSOutcome, DSPointers, DSSnapshot } from "./types";

/** A hand-rolled singly linked node: a value plus a `next` link. */
class ListNode {
  constructor(
    readonly value: number,
    public next: ListNode | null,
  ) {}
}

/**
 * Singly linked list with BOTH a head and a tail pointer.
 *
 * Snapshots list items HEAD → TAIL, so index 0 is the head and
 * `items[items.length - 1]` is the tail. `insertTail` is O(1) because of
 * the tail pointer; positional operations walk from the head and count
 * every visited node.
 *
 * `reverse` re-links every `next` in place (O(1) extra space). While the
 * walk runs the chain is temporarily split in two, so no canonical
 * head-to-tail read exists; those walk snapshots keep the ORIGINAL order
 * in `items` and use `current` to mark the node being re-linked. The final
 * snapshot shows the real reversed structure.
 */
export class VisualLinkedList {
  private head: ListNode | null = null;
  private tail: ListNode | null = null;
  private count = 0;

  private steps: DSSnapshot[] = [];
  private counters: DSCounters = { nodesVisited: 0, pointerChanges: 0 };

  /** Head → tail order. */
  toArray(): number[] {
    const items: number[] = [];
    for (let node = this.head; node !== null; node = node.next) {
      items.push(node.value);
    }
    return items;
  }

  /** Inserts a node before the current head. O(1). */
  insertHead(value: number): DSOutcome {
    this.begin();
    this.snapshot(
      this.count === 0
        ? `Insert ${value} at the head: the list is empty, so the new node becomes both the head and the tail.`
        : `Insert ${value} before the current head (position 0).`,
    );

    this.linkHead(value);

    this.snapshot(
      `Inserted ${value} at position 0 — it is the new head${
        this.count === 1 ? " and the new tail" : ""
      }.`,
      [0],
    );
    return this.finish(value);
  }

  /** Inserts a node after the current tail. O(1) thanks to the tail pointer. */
  insertTail(value: number): DSOutcome {
    this.begin();
    const before = this.count;
    this.snapshot(
      before === 0
        ? `Insert ${value} at the tail: the list is empty, so the new node becomes both the head and the tail.`
        : `Insert ${value} after the current tail (position ${before - 1}) — the tail pointer makes this O(1).`,
      before === 0 ? [] : [before - 1],
    );

    this.linkTail(value);

    this.snapshot(
      before === 0
        ? `Inserted ${value} — it is both the head and the tail.`
        : `Inserted ${value} at position ${this.count - 1} — it is the new tail.`,
      [this.count - 1],
    );
    return this.finish(value);
  }

  /**
   * Inserts a node at `position`. Valid positions are 0..size (inclusive):
   * size appends at the tail. Walks to the predecessor first — O(n).
   */
  insertAt(position: number, value: number): DSOutcome {
    this.begin();
    if (!Number.isInteger(position) || position < 0 || position > this.count) {
      this.snapshot(
        `Insert refused: position ${position} is out of range${
          this.count === 0
            ? " — the list is empty, so only position 0 is valid."
            : ` — the list has ${this.count} node${this.count === 1 ? "" : "s"}, so valid positions are 0..${this.count}.`
        }.`,
      );
      return this.finish(null, this.insertRangeError(position));
    }

    if (position === 0) {
      this.linkHead(value);
      this.snapshot(`Inserted ${value} at position 0 — it is the new head.`, [0]);
      return this.finish(value);
    }
    if (position === this.count) {
      this.linkTail(value);
      this.snapshot(
        `Inserted ${value} at position ${this.count - 1} — it is the new tail.`,
        [this.count - 1],
      );
      return this.finish(value);
    }

    this.snapshot(
      `Inserting ${value} at position ${position}: first walk to position ${
        position - 1
      }, the node whose link must change.`,
    );
    const walked = this.walkTo(position - 1);
    if (walked === null) {
      // Unreachable: the position was validated against the live size.
      return this.finish(null, this.insertRangeError(position));
    }

    walked.node.next = new ListNode(value, walked.node.next);
    this.count += 1;
    this.counters.pointerChanges += 1;

    this.snapshot(
      `Inserted ${value} at position ${position} — the node at position ${
        position - 1
      } now links to it.`,
      [position],
    );
    return this.finish(value);
  }

  /** Deletes the node at `position` (0..size - 1). Walks to it — O(n). */
  deleteAt(position: number): DSOutcome {
    this.begin();
    if (!Number.isInteger(position) || position < 0 || position >= this.count) {
      this.snapshot(
        `Delete refused: position ${position} is out of range${
          this.count === 0
            ? " — the list is empty, so there is nothing to delete."
            : ` — the list has ${this.count} node${this.count === 1 ? "" : "s"}, so valid positions are 0..${this.count - 1}.`
        }.`,
      );
      return this.finish(null, this.deleteRangeError(position));
    }

    this.snapshot(
      `Deleting the node at position ${position}: walk to it first to see the node that follows it.`,
    );
    const walked = this.walkTo(position);
    if (walked === null) {
      // Unreachable: the position was validated against the live size.
      return this.finish(null, this.deleteRangeError(position));
    }

    const value = walked.node.value;
    this.unlink(walked.prev, walked.node);

    this.snapshot(
      this.count === 0
        ? `Deleted ${value} at position ${position} — the list is empty now.`
        : `Deleted ${value} at position ${position} — ${
            walked.prev === null
              ? "the next node became the head."
              : walked.node.next === null
                ? "the previous node became the tail."
                : "its neighbours now link to each other."
          }`,
      this.count === 0 ? [] : [Math.min(position, this.count - 1)],
    );
    return this.finish(value);
  }

  /** Deletes the FIRST node holding `value`. Walks to it — O(n). */
  deleteValue(value: number): DSOutcome {
    this.begin();
    this.snapshot(
      `Deleting the first node that holds ${value}: scan from the head.`,
    );

    let prev: ListNode | null = null;
    let node: ListNode | null = this.head;
    let index = 0;
    while (node !== null && node.value !== value) {
      this.counters.nodesVisited += 1;
      this.snapshot(
        `Position ${index} holds ${node.value} — not a match, moving next.`,
        [index],
        index,
      );
      prev = node;
      node = node.next;
      index += 1;
    }

    if (node === null) {
      this.snapshot(
        `Scanned all ${this.count} node${this.count === 1 ? "" : "s"}: ${value} is not in the list — nothing was deleted.`,
      );
      return this.finish(
        null,
        `Value ${value} is not in the list — nothing was deleted.`,
      );
    }

    this.counters.nodesVisited += 1;
    this.snapshot(`Found ${value} at position ${index} — unlinking it.`, [index], index);

    this.unlink(prev, node);

    this.snapshot(
      this.count === 0
        ? `Deleted ${value} at position ${index} — the list is empty now.`
        : `Deleted ${value} at position ${index}.`,
      this.count === 0 ? [] : [Math.min(index, this.count - 1)],
    );
    return this.finish(value);
  }

  /** Returns the position of the first node holding `value`, or null. */
  search(value: number): DSOutcome {
    this.begin();
    if (this.count === 0) {
      this.snapshot(`Search: the list is empty, so ${value} cannot be in it.`);
      return this.finish(null);
    }

    let node: ListNode | null = this.head;
    let index = 0;
    while (node !== null) {
      this.counters.nodesVisited += 1;
      if (node.value === value) {
        this.snapshot(`Position ${index} holds ${value} — match.`, [index], index);
        this.snapshot(
          `Found ${value} at position ${index} after visiting ${this.counters.nodesVisited} node${
            this.counters.nodesVisited === 1 ? "" : "s"
          }.`,
          [index],
          index,
        );
        return this.finish(index);
      }
      this.snapshot(
        `Position ${index} holds ${node.value} — not a match, moving next.`,
        [index],
        index,
      );
      node = node.next;
      index += 1;
    }

    this.snapshot(
      `${value} is not in the list — visited all ${this.count} node${this.count === 1 ? "" : "s"}.`,
    );
    return this.finish(null);
  }

  /** Walks every node head → tail and returns the visited order. */
  traverse(): DSOutcome {
    this.begin();
    if (this.count === 0) {
      this.snapshot("Traversal: the list is empty — nothing to visit.");
      return this.finish([]);
    }

    let node: ListNode | null = this.head;
    let index = 0;
    while (node !== null) {
      this.counters.nodesVisited += 1;
      this.snapshot(`Visit position ${index}: value ${node.value}.`, [index], index);
      node = node.next;
      index += 1;
    }

    const order = this.toArray();
    this.snapshot(
      `Traversal complete — visited ${this.count} node${this.count === 1 ? "" : "s"} in head-to-tail order: ${order.join(" → ")}.`,
    );
    return this.finish(order);
  }

  /** Reverses the list in place by re-linking every `next` pointer. */
  reverse(): DSOutcome {
    this.begin();
    const values = this.toArray();
    if (this.count <= 1) {
      this.snapshot(
        this.count === 0
          ? "Reverse: the list is empty — nothing to reverse."
          : `Reverse: only one node (${values[0]}) — the list is already its own reverse.`,
      );
      return this.finish(values);
    }

    this.snapshot(
      `Reverse: walk the list once, re-linking every next pointer backwards, then swap the head and the tail (${this.count} nodes).`,
    );

    let prev: ListNode | null = null;
    let node: ListNode | null = this.head;
    let index = 0;
    while (node !== null) {
      this.counters.nodesVisited += 1;
      const next = node.next;
      node.next = prev;
      this.counters.pointerChanges += 1;
      this.snapshot(
        `Re-link position ${index} (value ${node.value}): its next pointer now references ${
          prev === null
            ? "null — it becomes the tail of the reversed list"
            : `the previous node (${prev.value})`
        }.`,
        [index],
        index,
      );
      prev = node;
      node = next;
      index += 1;
    }

    const oldHead = this.head;
    this.head = prev;
    this.tail = oldHead;
    this.counters.pointerChanges += 2;

    const reversed = this.toArray();
    this.snapshot(
      `Reverse complete — the head is now ${reversed[0]} and the tail is now ${
        reversed[reversed.length - 1]
      }.`,
    );
    return this.finish(reversed);
  }

  /** Returns how many nodes the list holds. O(1). */
  size(): DSOutcome {
    this.begin();
    this.snapshot(
      `Size: the list holds ${this.count} node${this.count === 1 ? "" : "s"}.`,
    );
    return this.finish(this.count);
  }

  /** Drops every node. Returns how many were removed. */
  clear(): DSOutcome {
    this.begin();
    const removed = this.count;
    if (removed === 0) {
      this.snapshot("Clear: the list is already empty.");
      return this.finish(0);
    }

    this.head = null;
    this.tail = null;
    this.count = 0;
    this.counters.pointerChanges += 2;
    this.snapshot(
      `Cleared ${removed} node${removed === 1 ? "" : "s"} — the list is empty now.`,
    );
    return this.finish(removed);
  }

  /** Head insert on the live structure; also updates the tail when empty. */
  private linkHead(value: number): void {
    this.head = new ListNode(value, this.head);
    this.count += 1;
    this.counters.pointerChanges += 1; // head
    if (this.count === 1) {
      this.tail = this.head;
      this.counters.pointerChanges += 1; // tail
    }
  }

  /** Tail insert on the live structure; also updates the head when empty. */
  private linkTail(value: number): void {
    const node = new ListNode(value, null);
    if (this.tail === null) {
      this.head = node;
      this.tail = node;
      this.counters.pointerChanges += 2; // head + tail
    } else {
      this.tail.next = node;
      this.tail = node;
      this.counters.pointerChanges += 2; // tail link + tail pointer
    }
    this.count += 1;
  }

  /** Unlinks `node` (whose predecessor is `prev`) and fixes head/tail. */
  private unlink(prev: ListNode | null, node: ListNode): void {
    if (prev === null) {
      this.head = node.next;
      this.counters.pointerChanges += 1;
      if (this.head === null) {
        this.tail = null;
        this.counters.pointerChanges += 1;
      }
    } else {
      prev.next = node.next;
      this.counters.pointerChanges += 1;
      if (node.next === null) {
        this.tail = prev;
        this.counters.pointerChanges += 1;
      }
    }
    this.count -= 1;
  }

  /**
   * Walks to `target`, emitting one snapshot per visited node with the
   * `current` pointer on it. Returns the node at `target` plus its
   * predecessor, or null when `target` is out of range.
   */
  private walkTo(target: number): { node: ListNode; prev: ListNode | null } | null {
    let prev: ListNode | null = null;
    let node: ListNode | null = this.head;
    for (let index = 0; index < target; index += 1) {
      if (node === null) return null;
      this.counters.nodesVisited += 1;
      this.snapshot(
        `Walking: position ${index} holds ${node.value}${
          node.next === null ? ", and it links to null" : `, linked to position ${index + 1}`
        }.`,
        [index],
        index,
      );
      prev = node;
      node = node.next;
    }
    if (node === null) return null;
    this.counters.nodesVisited += 1;
    this.snapshot(
      `Reached position ${target} — value ${node.value}.`,
      [target],
      target,
    );
    return { node, prev };
  }

  private insertRangeError(position: number): string {
    return this.count === 0
      ? `Position ${position} is out of range — the list is empty, so insertAt only accepts position 0.`
      : `Position ${position} is out of range — the list has ${this.count} node${
          this.count === 1 ? "" : "s"
        }, so insertAt accepts 0..${this.count}.`;
  }

  private deleteRangeError(position: number): string {
    return this.count === 0
      ? `Position ${position} is out of range — the list is empty, so there is nothing to delete.`
      : `Position ${position} is out of range — the list has ${this.count} node${
          this.count === 1 ? "" : "s"
        }, so deleteAt accepts 0..${this.count - 1}.`;
  }

  private begin(): void {
    // New array every time: previously returned snapshots are never touched.
    this.steps = [];
    this.counters = { nodesVisited: 0, pointerChanges: 0 };
  }

  private pointers(): DSPointers {
    return this.count === 0 ? {} : { head: 0, tail: this.count - 1 };
  }

  private snapshot(
    description: string,
    highlight: number[] = [],
    current?: number,
  ): void {
    this.steps.push({
      items: this.toArray(),
      highlight: [...highlight],
      pointers:
        current === undefined
          ? this.pointers()
          : { ...this.pointers(), current },
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

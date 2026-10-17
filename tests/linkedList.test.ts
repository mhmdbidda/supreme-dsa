import { describe, expect, it } from "vitest";
import { VisualLinkedList } from "../src/algorithms/data-structures/linkedList";
import { expectConsistentOutcome, expectNoMutation } from "./helpers/ds";

function build(values: number[]): VisualLinkedList {
  const list = new VisualLinkedList();
  for (const value of values) list.insertTail(value);
  return list;
}

describe("VisualLinkedList · insert", () => {
  it("inserts at the head, keeping order", () => {
    const list = new VisualLinkedList();
    list.insertHead(2);
    const outcome = list.insertHead(1);

    expect(list.toArray()).toEqual([1, 2]);
    expect(outcome.result).toBe(1);
    expect(outcome.error).toBeUndefined();
    expectConsistentOutcome(outcome, [1, 2]);

    const last = outcome.steps[outcome.steps.length - 1];
    expect(last.pointers.head).toBe(0);
    expect(last.highlight).toEqual([0]);
  });

  it("inserts at the tail, keeping order", () => {
    const list = new VisualLinkedList();
    list.insertTail(1);
    const outcome = list.insertTail(2);

    expect(list.toArray()).toEqual([1, 2]);
    expect(outcome.result).toBe(2);
    expectConsistentOutcome(outcome, [1, 2]);

    const last = outcome.steps[outcome.steps.length - 1];
    expect(last.pointers.tail).toBe(1);
    expect(last.highlight).toEqual([1]);
  });

  it("inserts in the middle at a position", () => {
    const list = build([1, 3]);
    const outcome = list.insertAt(1, 2);

    expect(outcome.error).toBeUndefined();
    expect(list.toArray()).toEqual([1, 2, 3]);
    // It walked at least the predecessor node, then re-linked one pointer.
    expect(outcome.counters.nodesVisited).toBeGreaterThanOrEqual(1);
    expect(outcome.counters.pointerChanges).toBe(1);
    expectConsistentOutcome(outcome, [1, 2, 3]);
  });

  it("insertAt(0) behaves like an insert at the head", () => {
    const list = build([2]);
    const outcome = list.insertAt(0, 1);

    expect(outcome.error).toBeUndefined();
    expect(list.toArray()).toEqual([1, 2]);
    expectConsistentOutcome(outcome, [1, 2]);
  });

  it("insertAt(size) appends at the tail", () => {
    const list = build([1, 2]);
    const outcome = list.insertAt(2, 3);

    expect(outcome.error).toBeUndefined();
    expect(list.toArray()).toEqual([1, 2, 3]);
    const last = outcome.steps[outcome.steps.length - 1];
    expect(last.pointers.tail).toBe(2);
  });

  it("insertAt works on the empty list at position 0 only", () => {
    const emptyList = new VisualLinkedList();
    const refused = emptyList.insertAt(1, 6);
    expect(refused.error).toBeTruthy();
    expect(emptyList.toArray()).toEqual([]);
    expectConsistentOutcome(refused, []);

    const list = new VisualLinkedList();
    const ok = list.insertAt(0, 5);
    expect(ok.error).toBeUndefined();
    expect(list.toArray()).toEqual([5]);
    expectConsistentOutcome(ok, [5]);
  });

  it("rejects an out-of-range position without mutating the list", () => {
    const list = build([1]);
    const outcome = list.insertAt(5, 9);

    expect(outcome.error).toMatch(/out of range/i);
    expect(outcome.result).toBeNull();
    expect(list.toArray()).toEqual([1]);
    expectConsistentOutcome(outcome, [1]);
  });

  it("rejects a negative position", () => {
    const list = build([1, 2]);
    const outcome = list.insertAt(-1, 9);

    expect(outcome.error).toMatch(/out of range/i);
    expect(list.toArray()).toEqual([1, 2]);
  });
});

describe("VisualLinkedList · delete", () => {
  it("deletes the head", () => {
    const list = build([1, 2, 3]);
    const outcome = list.deleteAt(0);

    expect(outcome.result).toBe(1);
    expect(list.toArray()).toEqual([2, 3]);
    expectConsistentOutcome(outcome, [2, 3]);
  });

  it("deletes the tail and moves the tail pointer", () => {
    const list = build([1, 2, 3]);
    const outcome = list.deleteAt(2);

    expect(outcome.result).toBe(3);
    expect(list.toArray()).toEqual([1, 2]);

    const last = outcome.steps[outcome.steps.length - 1];
    expect(last.pointers.tail).toBe(1);
    expectConsistentOutcome(outcome, [1, 2]);
  });

  it("deletes from the middle and relinks the neighbours", () => {
    const list = build([1, 2, 3]);
    const outcome = list.deleteAt(1);

    expect(outcome.result).toBe(2);
    expect(list.toArray()).toEqual([1, 3]);
    expect(outcome.counters.pointerChanges).toBe(1);
    expectConsistentOutcome(outcome, [1, 3]);
  });

  it("deletes the single node, leaving an empty list", () => {
    const list = build([1]);
    const outcome = list.deleteAt(0);

    expect(outcome.result).toBe(1);
    expect(list.toArray()).toEqual([]);
    expectConsistentOutcome(outcome, []);

    const last = outcome.steps[outcome.steps.length - 1];
    expect(last.pointers.head).toBeUndefined();
    expect(last.pointers.tail).toBeUndefined();
  });

  it("rejects an invalid position without mutating the list", () => {
    const list = build([1]);
    const outcome = list.deleteAt(3);

    expect(outcome.error).toMatch(/out of range/i);
    expect(outcome.result).toBeNull();
    expect(list.toArray()).toEqual([1]);
    expectConsistentOutcome(outcome, [1]);
  });

  it("rejects deleteAt on an empty list", () => {
    const list = new VisualLinkedList();
    const outcome = list.deleteAt(0);

    expect(outcome.error).toBeTruthy();
    expect(list.toArray()).toEqual([]);
  });

  it("deleteValue removes the first match only", () => {
    const list = build([1, 2, 1]);
    const outcome = list.deleteValue(1);

    expect(outcome.result).toBe(1);
    expect(list.toArray()).toEqual([2, 1]);
    expectConsistentOutcome(outcome, [2, 1]);
  });

  it("deleteValue errors when the value is missing", () => {
    const list = build([1, 2]);
    const outcome = list.deleteValue(42);

    expect(outcome.error).toBeTruthy();
    expect(outcome.result).toBeNull();
    expect(list.toArray()).toEqual([1, 2]);
    expectConsistentOutcome(outcome, [1, 2]);
  });
});

describe("VisualLinkedList · search", () => {
  it("finds a value and reports its position", () => {
    const list = build([4, 8, 15]);
    const outcome = list.search(15);

    expect(outcome.result).toBe(2);
    expect(outcome.error).toBeUndefined();
    expect(outcome.counters.nodesVisited).toBe(3);

    const last = outcome.steps[outcome.steps.length - 1];
    expect(last.pointers.current).toBe(2);
    expect(last.highlight).toEqual([2]);
  });

  it("returns null when the value is missing", () => {
    const list = build([4, 8, 15]);
    const outcome = list.search(99);

    expect(outcome.result).toBeNull();
    expect(list.toArray()).toEqual([4, 8, 15]); // unchanged
    expectConsistentOutcome(outcome, [4, 8, 15]);
  });
});

describe("VisualLinkedList · traverse and reverse", () => {
  it("traverse visits every node in head-to-tail order", () => {
    const list = build([3, 5, 8]);
    const outcome = list.traverse();

    expect(outcome.result).toEqual([3, 5, 8]);
    expect(outcome.counters.nodesVisited).toBe(3);

    // Every visited node carries the current pointer, one step each.
    const currents = outcome.steps
      .filter((step) => step.pointers.current !== undefined)
      .map((step) => step.pointers.current);
    expect(currents).toEqual([0, 1, 2]);
  });

  it("traverse of an empty list returns an empty order", () => {
    const outcome = new VisualLinkedList().traverse();
    expect(outcome.result).toEqual([]);
    expect(outcome.counters.nodesVisited).toBe(0);
  });

  it("reverse of an empty list is a no-op", () => {
    const list = new VisualLinkedList();
    const outcome = list.reverse();

    expect(outcome.result).toEqual([]);
    expect(list.toArray()).toEqual([]);
    expectConsistentOutcome(outcome, []);
  });

  it("reverse of a single node keeps it in place", () => {
    const list = build([7]);
    const outcome = list.reverse();

    expect(outcome.result).toEqual([7]);
    expect(list.toArray()).toEqual([7]);
    expectConsistentOutcome(outcome, [7]);
  });

  it("reverse of many nodes flips head and tail", () => {
    const list = build([1, 2, 3, 4]);
    const outcome = list.reverse();

    expect(outcome.result).toEqual([4, 3, 2, 1]);
    expect(list.toArray()).toEqual([4, 3, 2, 1]);
    expectConsistentOutcome(outcome, [4, 3, 2, 1]);

    const last = outcome.steps[outcome.steps.length - 1];
    expect(last.pointers.head).toBe(0);
    expect(last.pointers.tail).toBe(3);
    // 4 next re-links plus the head/tail swap.
    expect(outcome.counters.pointerChanges).toBeGreaterThanOrEqual(6);

    // The reversed list stays fully usable.
    list.insertHead(0);
    expect(list.toArray()).toEqual([0, 4, 3, 2, 1]);
    list.insertTail(5);
    expect(list.toArray()).toEqual([0, 4, 3, 2, 1, 5]);
  });

  it("reverse twice restores the original order", () => {
    const list = build([1, 2, 3]);
    list.reverse();
    list.reverse();
    expect(list.toArray()).toEqual([1, 2, 3]);
  });
});

describe("VisualLinkedList · size, clear and snapshot hygiene", () => {
  it("size reports the node count", () => {
    const list = new VisualLinkedList();
    expect(list.size().result).toBe(0);
    list.insertHead(1);
    list.insertTail(2);
    expect(list.size().result).toBe(2);
  });

  it("clear empties the list and reports the count", () => {
    const list = build([1, 2]);
    const outcome = list.clear();

    expect(outcome.result).toBe(2);
    expect(list.toArray()).toEqual([]);
    expect(list.size().result).toBe(0);
    expectConsistentOutcome(outcome, []);

    expect(list.clear().result).toBe(0);
  });

  it("never rewrites an earlier snapshot, across steps and operations", () => {
    const list = build([1, 2, 3]);
    const reverseGuard = expectNoMutation(list.reverse());
    const searchGuard = expectNoMutation(list.search(1));
    const deleteGuard = expectNoMutation(list.deleteAt(0));

    list.insertHead(9);
    list.traverse();
    list.clear();

    reverseGuard();
    searchGuard();
    deleteGuard();
  });
});

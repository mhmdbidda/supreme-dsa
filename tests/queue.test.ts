import { describe, expect, it } from "vitest";
import { VisualQueue } from "../src/algorithms/data-structures/queue";
import { expectConsistentOutcome, expectNoMutation } from "./helpers/ds";

describe("VisualQueue", () => {
  it("dequeues in FIFO order", () => {
    const queue = new VisualQueue();

    queue.enqueue(1);
    queue.enqueue(2);
    const enqueue3 = queue.enqueue(3);
    expect(queue.toArray()).toEqual([1, 2, 3]); // front → rear
    expectConsistentOutcome(enqueue3, [1, 2, 3]);

    expect(queue.dequeue().result).toBe(1);
    expect(queue.dequeue().result).toBe(2);
    expect(queue.dequeue().result).toBe(3);
    expect(queue.toArray()).toEqual([]);
  });

  it("returns an error (never throws) when dequeuing an empty queue", () => {
    const queue = new VisualQueue();
    const outcome = queue.dequeue();

    expect(outcome.error).toMatch(/underflow/i);
    expect(outcome.result).toBeNull();
    expect(queue.toArray()).toEqual([]);
    expectConsistentOutcome(outcome, []);
  });

  it("returns an error (never throws) when reading the front of an empty queue", () => {
    const queue = new VisualQueue();
    const outcome = queue.front();

    expect(outcome.error).toMatch(/underflow/i);
    expect(outcome.result).toBeNull();
    expectConsistentOutcome(outcome, []);
  });

  it("keeps front and rear pointers correct through mixed operations", () => {
    const queue = new VisualQueue();
    queue.enqueue(10);
    queue.enqueue(20);

    const mixed = queue.dequeue();
    expect(mixed.result).toBe(10);
    expect(queue.toArray()).toEqual([20]);
    expectConsistentOutcome(mixed, [20]);

    queue.enqueue(30);
    const outcome = queue.enqueue(40);
    expect(queue.toArray()).toEqual([20, 30, 40]);

    const last = outcome.steps[outcome.steps.length - 1];
    expect(last.pointers.front).toBe(0);
    expect(last.pointers.rear).toBe(2);
    expect(last.highlight).toEqual([2]);
  });

  it("points front and rear at the same node while a single element is queued", () => {
    const queue = new VisualQueue();
    const enqueue = queue.enqueue(7);

    const afterEnqueue = enqueue.steps[enqueue.steps.length - 1];
    expect(afterEnqueue.pointers.front).toBe(0);
    expect(afterEnqueue.pointers.rear).toBe(0);
    expect(queue.front().result).toBe(7);

    const dequeue = queue.dequeue();
    expect(dequeue.result).toBe(7);
    expect(queue.toArray()).toEqual([]);

    const afterDequeue = dequeue.steps[dequeue.steps.length - 1];
    expect(afterDequeue.pointers.front).toBeUndefined();
    expect(afterDequeue.pointers.rear).toBeUndefined();
    expectConsistentOutcome(dequeue, []);
  });

  it("answers isEmpty and size correctly", () => {
    const queue = new VisualQueue();
    expect(queue.isEmpty().result).toBe(true);
    expect(queue.size().result).toBe(0);
    queue.enqueue(1);
    queue.enqueue(2);
    expect(queue.isEmpty().result).toBe(false);
    expect(queue.size().result).toBe(2);
    queue.dequeue();
    expect(queue.size().result).toBe(1);
  });

  it("clears everything and reports how many nodes were removed", () => {
    const queue = new VisualQueue();
    queue.enqueue(1);
    queue.enqueue(2);

    const outcome = queue.clear();
    expect(outcome.result).toBe(2);
    expect(queue.toArray()).toEqual([]);
    expect(queue.isEmpty().result).toBe(true);
    expectConsistentOutcome(outcome, []);

    // Clearing an empty queue is allowed and reports zero removals.
    expect(queue.clear().result).toBe(0);
  });

  it("stays usable after the queue ran empty mid-playback", () => {
    const queue = new VisualQueue();
    queue.enqueue(1);
    queue.dequeue();
    queue.enqueue(9);
    queue.enqueue(10);
    expect(queue.toArray()).toEqual([9, 10]);
    expect(queue.dequeue().result).toBe(9);
  });

  it("never rewrites an earlier snapshot, across steps and operations", () => {
    const queue = new VisualQueue();
    queue.enqueue(1);
    const dequeueGuard = expectNoMutation(queue.dequeue());
    const frontGuard = expectNoMutation(queue.front());
    const enqueueGuard = expectNoMutation(queue.enqueue(5));

    queue.enqueue(6);
    queue.clear();

    dequeueGuard();
    frontGuard();
    enqueueGuard();
  });
});

import { describe, expect, it } from "vitest";
import { VisualStack } from "../src/algorithms/data-structures/stack";
import { expectConsistentOutcome, expectNoMutation } from "./helpers/ds";

describe("VisualStack", () => {
  it("pushes and pops in LIFO order", () => {
    const stack = new VisualStack();

    stack.push(1);
    stack.push(2);
    const push3 = stack.push(3);
    expect(stack.toArray()).toEqual([1, 2, 3]); // bottom → top
    expectConsistentOutcome(push3, [1, 2, 3]);

    expect(stack.pop().result).toBe(3);
    expect(stack.pop().result).toBe(2);
    expect(stack.pop().result).toBe(1);
    expect(stack.toArray()).toEqual([]);
  });

  it("marks the top pointer and highlights it in the last push step", () => {
    const stack = new VisualStack();
    stack.push(4);
    const outcome = stack.push(9);

    const last = outcome.steps[outcome.steps.length - 1];
    expect(last.pointers.top).toBe(1);
    expect(last.highlight).toEqual([1]);
    expect(outcome.counters.pointerChanges).toBe(1);
  });

  it("returns an error (never throws) when popping an empty stack", () => {
    const stack = new VisualStack();
    const outcome = stack.pop();

    expect(outcome.error).toMatch(/underflow/i);
    expect(outcome.result).toBeNull();
    expect(stack.toArray()).toEqual([]);
    expectConsistentOutcome(outcome, []);
  });

  it("returns an error (never throws) when peeking at an empty stack", () => {
    const stack = new VisualStack();
    const outcome = stack.peek();

    expect(outcome.error).toMatch(/underflow/i);
    expect(outcome.result).toBeNull();
    expect(stack.toArray()).toEqual([]);
    expectConsistentOutcome(outcome, []);
  });

  it("peek reads the top without removing it", () => {
    const stack = new VisualStack();
    stack.push(5);
    stack.push(7);
    const outcome = stack.peek();

    expect(outcome.error).toBeUndefined();
    expect(outcome.result).toBe(7);
    expect(stack.toArray()).toEqual([5, 7]);
    expect(outcome.counters.nodesVisited).toBe(1);
  });

  it("tracks the size across pushes and pops", () => {
    const stack = new VisualStack();
    expect(stack.size().result).toBe(0);
    stack.push(1);
    stack.push(2);
    expect(stack.size().result).toBe(2);
    stack.pop();
    expect(stack.size().result).toBe(1);
  });

  it("answers isEmpty correctly", () => {
    const stack = new VisualStack();
    expect(stack.isEmpty().result).toBe(true);
    stack.push(1);
    expect(stack.isEmpty().result).toBe(false);
  });

  it("clears everything and reports how many items were removed", () => {
    const stack = new VisualStack();
    stack.push(1);
    stack.push(2);
    stack.push(3);

    const outcome = stack.clear();
    expect(outcome.result).toBe(3);
    expect(stack.toArray()).toEqual([]);
    expect(stack.size().result).toBe(0);
    expectConsistentOutcome(outcome, []);

    // Clearing an empty stack is allowed and reports zero removals.
    const again = stack.clear();
    expect(again.error).toBeUndefined();
    expect(again.result).toBe(0);
  });

  it("never rewrites an earlier snapshot, across steps and operations", () => {
    const stack = new VisualStack();
    const pushGuard = expectNoMutation(stack.push(1));
    const popGuard = expectNoMutation(stack.pop());
    const clearGuard = expectNoMutation(stack.clear());

    stack.push(99);
    stack.push(100);
    stack.pop();

    pushGuard();
    popGuard();
    clearGuard();
  });
});

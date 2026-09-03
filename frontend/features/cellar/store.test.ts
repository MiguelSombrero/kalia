import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REMOVE_UNDO_DELAY_MS, useBottleRemovalStore } from "./store";

const removal = (bottleId: string, entryId: string, lastBottle = false) => ({
  bottleId,
  entryId,
  lastBottle,
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  useBottleRemovalStore.getState().undoRemoval();
  vi.useRealTimers();
});

describe("useBottleRemovalStore", () => {
  it("tracks the pending removal and finalizes it once the undo window elapses", async () => {
    const finalize = vi.fn();

    useBottleRemovalStore.getState().startRemoval(removal("bottle-1", "entry-1"), finalize);

    expect(useBottleRemovalStore.getState().pending).toEqual(removal("bottle-1", "entry-1"));
    expect(finalize).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(REMOVE_UNDO_DELAY_MS);

    expect(finalize).toHaveBeenCalledTimes(1);
    expect(useBottleRemovalStore.getState().pending).toBeNull();
    expect(useBottleRemovalStore.getState().finalizing).toEqual([]);
  });

  it("carries the last-bottle flag on the pending removal so the toast can name the consequence", () => {
    useBottleRemovalStore.getState().startRemoval(removal("bottle-1", "entry-1", true), vi.fn());

    expect(useBottleRemovalStore.getState().pending?.lastBottle).toBe(true);
  });

  it("keeps the bottle masked via `finalizing` until the delayed DELETE settles, not just until the timer fires", async () => {
    let resolveDelete!: () => void;
    const finalize = vi.fn(() => new Promise<void>((resolve) => (resolveDelete = resolve)));

    useBottleRemovalStore.getState().startRemoval(removal("bottle-1", "entry-1"), finalize);
    await vi.advanceTimersByTimeAsync(REMOVE_UNDO_DELAY_MS);

    // The timer has fired and `pending` cleared, but the DELETE it kicked
    // off hasn't resolved yet — the bottle must still be masked, or it
    // flickers back into view for the length of that request.
    expect(useBottleRemovalStore.getState().pending).toBeNull();
    expect(useBottleRemovalStore.getState().finalizing).toEqual([removal("bottle-1", "entry-1")]);

    resolveDelete();
    await vi.advanceTimersByTimeAsync(0);

    expect(useBottleRemovalStore.getState().finalizing).toEqual([]);
  });

  it("cancels the pending removal on undo, never calling finalize", async () => {
    const finalize = vi.fn();

    useBottleRemovalStore.getState().startRemoval(removal("bottle-1", "entry-1"), finalize);
    useBottleRemovalStore.getState().undoRemoval();

    await vi.advanceTimersByTimeAsync(REMOVE_UNDO_DELAY_MS);

    expect(finalize).not.toHaveBeenCalled();
    expect(useBottleRemovalStore.getState().pending).toBeNull();
  });

  it("finalizes the first removal immediately when a second one starts — one toast at a time", async () => {
    let resolveFirstDelete!: () => void;
    const finalizeFirst = vi.fn(() => new Promise<void>((resolve) => (resolveFirstDelete = resolve)));
    const finalizeSecond = vi.fn();

    useBottleRemovalStore.getState().startRemoval(removal("bottle-1", "entry-1"), finalizeFirst);
    useBottleRemovalStore.getState().startRemoval(removal("bottle-2", "entry-1"), finalizeSecond);
    await vi.advanceTimersByTimeAsync(0);

    expect(finalizeFirst).toHaveBeenCalledTimes(1);
    expect(finalizeSecond).not.toHaveBeenCalled();
    expect(useBottleRemovalStore.getState().pending).toEqual(removal("bottle-2", "entry-1"));
    // The first bottle is no longer `pending`, but its DELETE is already in
    // flight — still masked, so it doesn't reappear before that settles.
    expect(useBottleRemovalStore.getState().finalizing).toEqual([removal("bottle-1", "entry-1")]);
    resolveFirstDelete();

    await vi.advanceTimersByTimeAsync(REMOVE_UNDO_DELAY_MS);

    expect(finalizeSecond).toHaveBeenCalledTimes(1);
    expect(finalizeFirst).toHaveBeenCalledTimes(1);
    expect(useBottleRemovalStore.getState().finalizing).toEqual([]);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { hiddenBottleCountForEntry, isBottleHidden, useBottleRemovalStore } from "./store";

const removal = (bottleId: string, entryId: string) => ({ bottleId, entryId });

afterEach(() => {
  useBottleRemovalStore.setState({ removing: [], outcome: null });
});

describe("useBottleRemovalStore", () => {
  it("tracks a removal as in flight until it finishes", () => {
    useBottleRemovalStore.getState().startRemoving(removal("bottle-1", "entry-1"));

    expect(useBottleRemovalStore.getState().removing).toEqual([removal("bottle-1", "entry-1")]);
    expect(isBottleHidden(useBottleRemovalStore.getState().removing, "bottle-1")).toBe(true);

    useBottleRemovalStore.getState().finishRemoving(removal("bottle-1", "entry-1"), { lastBottle: false });

    expect(useBottleRemovalStore.getState().removing).toEqual([]);
    expect(isBottleHidden(useBottleRemovalStore.getState().removing, "bottle-1")).toBe(false);
  });

  it("tracks two concurrent removals independently", () => {
    useBottleRemovalStore.getState().startRemoving(removal("bottle-1", "entry-1"));
    useBottleRemovalStore.getState().startRemoving(removal("bottle-2", "entry-1"));

    expect(hiddenBottleCountForEntry(useBottleRemovalStore.getState().removing, "entry-1")).toBe(2);

    useBottleRemovalStore.getState().finishRemoving(removal("bottle-1", "entry-1"), { lastBottle: false });

    expect(hiddenBottleCountForEntry(useBottleRemovalStore.getState().removing, "entry-1")).toBe(1);
    expect(isBottleHidden(useBottleRemovalStore.getState().removing, "bottle-2")).toBe(true);
  });

  it("records a successful removal's outcome, carrying whether it emptied the entry", () => {
    useBottleRemovalStore.getState().startRemoving(removal("bottle-1", "entry-1"));
    useBottleRemovalStore.getState().finishRemoving(removal("bottle-1", "entry-1"), { lastBottle: true });

    expect(useBottleRemovalStore.getState().outcome).toEqual({ lastBottle: true });
  });

  it("records a failed removal's outcome", () => {
    useBottleRemovalStore.getState().startRemoving(removal("bottle-1", "entry-1"));
    useBottleRemovalStore.getState().finishRemoving(removal("bottle-1", "entry-1"), { failed: true });

    expect(useBottleRemovalStore.getState().outcome).toEqual({ failed: true });
  });

  it("a failed removal stops hiding the bottle, restoring it to the list", () => {
    useBottleRemovalStore.getState().startRemoving(removal("bottle-1", "entry-1"));
    useBottleRemovalStore.getState().finishRemoving(removal("bottle-1", "entry-1"), { failed: true });

    expect(isBottleHidden(useBottleRemovalStore.getState().removing, "bottle-1")).toBe(false);
  });

  it("clears the outcome on dismiss", () => {
    useBottleRemovalStore.getState().finishRemoving(removal("bottle-1", "entry-1"), { lastBottle: false });
    useBottleRemovalStore.getState().dismissOutcome();

    expect(useBottleRemovalStore.getState().outcome).toBeNull();
  });
});

import { create } from "zustand";

/** ~5s undo window, product-owner decision 2026-08-22. */
export const REMOVE_UNDO_DELAY_MS = 5000;

type Removal = {
  bottleId: string;
  entryId: string;
  /** True when this bottle is the entry's last, so removing it empties the cellar of that beer. */
  lastBottle: boolean;
};

type BottleRemovalStore = {
  /** The removal currently showing its undo toast — at most one at a time. */
  pending: Removal | null;
  /**
   * Removals whose `DELETE` has been dispatched but not yet settled. Kept
   * hidden alongside `pending` so a bottle doesn't flicker back into view
   * between the moment a second removal finalizes the first (immediately,
   * fire-and-forget) and the moment that first request actually resolves.
   */
  finalizing: Removal[];
  /**
   * Starts the undo window for one bottle's removal. If another removal is
   * already pending, it is finalized immediately first — one toast at a
   * time: starting a second removal never queues behind the first.
   */
  startRemoval: (removal: Removal, finalize: () => Promise<unknown> | void) => void;
  /** Cancels the pending removal — `finalize` is never called. */
  undoRemoval: () => void;
};

const sameRemoval = (a: Removal, b: Removal) => a.bottleId === b.bottleId && a.entryId === b.entryId;

type RemovalOverlay = Pick<BottleRemovalStore, "pending" | "finalizing">;

/** True while a bottle is hidden by the undo window or its in-flight DELETE. */
export const isBottleHidden = ({ pending, finalizing }: RemovalOverlay, bottleId: string): boolean =>
  pending?.bottleId === bottleId || finalizing.some((removal) => removal.bottleId === bottleId);

/** How many of an entry's bottles are currently hidden by the overlay above. */
export const hiddenBottleCountForEntry = (
  { pending, finalizing }: RemovalOverlay,
  entryId: string,
): number =>
  (pending?.entryId === entryId ? 1 : 0) +
  finalizing.filter((removal) => removal.entryId === entryId).length;

export const useBottleRemovalStore = create<BottleRemovalStore>((set) => {
  // Kept outside the reactive state: a timeout handle and a closure aren't
  // state a component should re-render on.
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let scheduled: { removal: Removal; finalize: () => Promise<unknown> | void } | null = null;

  const dispatch = (removal: Removal, finalize: () => Promise<unknown> | void) => {
    set((state) => ({ finalizing: [...state.finalizing, removal] }));
    Promise.resolve()
      .then(finalize)
      .catch(() => {
        // The undo window has already closed; a failed delayed DELETE has no
        // dialog left to report through. Falling out of `finalizing` is the
        // most this store can do — it stops masking the bottle forever.
      })
      .finally(() => {
        set((state) => ({
          finalizing: state.finalizing.filter((item) => !sameRemoval(item, removal)),
        }));
      });
  };

  return {
    pending: null,
    finalizing: [],
    startRemoval: (removal, finalize) => {
      if (timeoutId && scheduled) {
        clearTimeout(timeoutId);
        dispatch(scheduled.removal, scheduled.finalize);
      }
      scheduled = { removal, finalize };
      timeoutId = setTimeout(() => {
        timeoutId = null;
        scheduled = null;
        set({ pending: null });
        dispatch(removal, finalize);
      }, REMOVE_UNDO_DELAY_MS);
      set({ pending: removal });
    },
    undoRemoval: () => {
      if (!timeoutId) return;
      clearTimeout(timeoutId);
      timeoutId = null;
      scheduled = null;
      set({ pending: null });
    },
  };
});

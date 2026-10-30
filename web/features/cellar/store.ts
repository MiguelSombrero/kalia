import { create } from "zustand";

type Removal = {
  bottleId: string;
  entryId: string;
};

/** What the outcome toast reports once a removal's `DELETE` settles. */
type RemovalOutcome = { lastBottle: boolean } | { failed: true };

type BottleRemovalStore = {
  /** Bottles whose `DELETE` is in flight — hidden optimistically until it settles. */
  removing: Removal[];
  /** The most recently settled removal, shown by the outcome toast. */
  outcome: RemovalOutcome | null;
  startRemoving: (removal: Removal) => void;
  finishRemoving: (removal: Removal, outcome: RemovalOutcome) => void;
  dismissOutcome: () => void;
};

const sameRemoval = (a: Removal, b: Removal) => a.bottleId === b.bottleId && a.entryId === b.entryId;

/** True while a bottle's `DELETE` is in flight. */
export const isBottleHidden = (removing: Removal[], bottleId: string): boolean =>
  removing.some((removal) => removal.bottleId === bottleId);

/** How many of an entry's bottles currently have a `DELETE` in flight. */
export const hiddenBottleCountForEntry = (removing: Removal[], entryId: string): number =>
  removing.filter((removal) => removal.entryId === entryId).length;

export const useBottleRemovalStore = create<BottleRemovalStore>((set) => ({
  removing: [],
  outcome: null,
  startRemoving: (removal) => set((state) => ({ removing: [...state.removing, removal] })),
  finishRemoving: (removal, outcome) =>
    set((state) => ({
      removing: state.removing.filter((item) => !sameRemoval(item, removal)),
      outcome,
    })),
  dismissOutcome: () => set({ outcome: null }),
}));

import { create } from "zustand";

type Removal = {
  bottleId: string;
  entryId: string;
};

/** What the outcome toast reports once a removal's `DELETE` settles, or an edit finds its bottle gone. */
type RemovalOutcome = { lastBottle: boolean } | { failed: true; conflict?: true } | { gone: true };

type BottleRemovalStore = {
  /** Bottles whose `DELETE` is in flight — hidden optimistically until it settles. */
  removing: Removal[];
  /** The most recently settled removal, shown by the outcome toast. */
  outcome: RemovalOutcome | null;
  startRemoving: (removal: Removal) => void;
  finishRemoving: (removal: Removal, outcome: RemovalOutcome) => void;
  /** An edit's bottle was already removed: the dialog and tile are about to unmount, so the notice lives here. */
  noteBottleGone: () => void;
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
  noteBottleGone: () => set({ outcome: { gone: true } }),
  dismissOutcome: () => set({ outcome: null }),
}));

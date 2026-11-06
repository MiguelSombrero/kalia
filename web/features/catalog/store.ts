import { create } from "zustand";

type AddedBeer = { id: string; name: string };

type JustAddedStore = {
  /** The beer this browser added most recently; gone on a reload (ADR-0082). */
  beer: AddedBeer | null;
  toastOpen: boolean;
  /** Whether the added beer's row should take focus when it appears. */
  focusPending: boolean;
  announce: (beer: AddedBeer) => void;
  dismissToast: () => void;
  focusTaken: () => void;
};

export const useJustAddedStore = create<JustAddedStore>((set) => ({
  beer: null,
  toastOpen: false,
  focusPending: false,
  announce: (beer) => set({ beer, toastOpen: true, focusPending: true }),
  dismissToast: () => set({ toastOpen: false, focusPending: false }),
  focusTaken: () => set({ focusPending: false }),
}));

type RemovedBeer = { name: string };

type BeerRemovedStore = {
  /** The beer this admin removed most recently, until its notice is dismissed; gone on a reload. */
  beer: RemovedBeer | null;
  announce: (beer: RemovedBeer) => void;
  dismiss: () => void;
};

export const useBeerRemovedStore = create<BeerRemovedStore>((set) => ({
  beer: null,
  announce: (beer) => set({ beer }),
  dismiss: () => set({ beer: null }),
}));

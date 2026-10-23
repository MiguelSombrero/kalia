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

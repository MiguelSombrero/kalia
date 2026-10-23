import { create } from "zustand";

type AddedBeer = { id: string; name: string };

type JustAddedStore = {
  /** The beer this browser added most recently; gone on a reload (ADR-0082). */
  beer: AddedBeer | null;
  toastOpen: boolean;
  announce: (beer: AddedBeer) => void;
  dismissToast: () => void;
};

export const useJustAddedStore = create<JustAddedStore>((set) => ({
  beer: null,
  toastOpen: false,
  announce: (beer) => set({ beer, toastOpen: true }),
  dismissToast: () => set({ toastOpen: false }),
}));

import { create } from "zustand";
import { emptyFilters, type Filters } from "./model";

type FiltersStore = {
  applied: Filters;
  apply: (filters: Filters) => void;
  setQuery: (query: string) => void;
  reset: () => void;
};

export const useFiltersStore = create<FiltersStore>((set) => ({
  applied: emptyFilters(),
  apply: (filters) => set((state) => ({ applied: { ...filters, query: state.applied.query } })),
  setQuery: (query) => set((state) => ({ applied: { ...state.applied, query } })),
  reset: () => set({ applied: emptyFilters() }),
}));

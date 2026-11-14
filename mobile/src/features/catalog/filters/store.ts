import { create } from "zustand";
import type { CatalogLinkFilter } from "@/lib/catalogLink";
import { emptyFilters, type Filters } from "./model";

type FiltersStore = {
  applied: Filters;
  apply: (filters: Filters) => void;
  setQuery: (query: string) => void;
  showOnly: (filter: CatalogLinkFilter) => void;
  reset: () => void;
};

export const useFiltersStore = create<FiltersStore>((set) => ({
  applied: emptyFilters(),
  apply: (filters) => set((state) => ({ applied: { ...filters, query: state.applied.query } })),
  setQuery: (query) => set((state) => ({ applied: { ...state.applied, query } })),
  showOnly: (filter) =>
    set({
      applied: {
        ...emptyFilters(),
        ...("brewery" in filter ? { breweryId: filter.brewery.id, breweryName: filter.brewery.name } : {}),
        ...("style" in filter ? { style: filter.style } : {}),
        ...("country" in filter ? { countryCode: filter.country } : {}),
      },
    }),
  reset: () => set({ applied: emptyFilters() }),
}));

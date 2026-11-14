import { create } from "zustand";
import type { CatalogLinkFilter } from "@/lib/catalogLink";
import { emptyFilters, type Filters } from "./model";

type FiltersStore = {
  applied: Filters;
  text: string;
  apply: (filters: Filters) => void;
  setQuery: (query: string) => void;
  setText: (text: string) => void;
  showOnly: (filter: CatalogLinkFilter) => void;
  reset: () => void;
};

/** `applied` is what the list asks the API; `text` is what the search field shows, which `applied.query` follows once typing pauses. Both live as long as the app is open and start empty. */
export const useFiltersStore = create<FiltersStore>((set) => ({
  applied: emptyFilters(),
  text: "",
  apply: (filters) => set((state) => ({ applied: { ...filters, query: state.applied.query } })),
  setQuery: (query) => set((state) => ({ applied: { ...state.applied, query } })),
  setText: (text) => set({ text }),
  showOnly: (filter) =>
    set({
      text: "",
      applied: {
        ...emptyFilters(),
        ...("brewery" in filter ? { breweryId: filter.brewery.id, breweryName: filter.brewery.name } : {}),
        ...("style" in filter ? { style: filter.style } : {}),
        ...("country" in filter ? { countryCode: filter.country } : {}),
      },
    }),
  reset: () => set({ applied: emptyFilters(), text: "" }),
}));

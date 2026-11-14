import { create } from "zustand";

export type CatalogLinkFilter = { brewery: { id: string; name: string } } | { style: string } | { country: string };

type CatalogLinkStore = {
  pending: CatalogLinkFilter | null;
  take: () => CatalogLinkFilter | null;
};

export const useCatalogLink = create<CatalogLinkStore>((set, get) => ({
  pending: null,
  take: () => {
    const { pending } = get();
    set({ pending: null });
    return pending;
  },
}));

/** Asks the Catalog to show only this one filter, replacing its search, other filters and sort; the Catalog applies it as soon as it is on screen. `country` is an ISO 3166-1 alpha-2 code. */
export const showCatalogWith = (filter: CatalogLinkFilter) => {
  useCatalogLink.setState({ pending: filter });
};

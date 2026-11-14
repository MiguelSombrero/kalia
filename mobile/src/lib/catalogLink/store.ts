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

/** `country` is an ISO 3166-1 alpha-2 code. */
export const showCatalogWith = (filter: CatalogLinkFilter) => {
  useCatalogLink.setState({ pending: filter });
};

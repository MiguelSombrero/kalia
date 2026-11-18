import { create } from "zustand";

export type CatalogLinkFilter = { brewery: { id: string; name: string } } | { style: string } | { country: string };

type CatalogLinkStore = {
  pending: CatalogLinkFilter | null;
};

export const useCatalogLink = create<CatalogLinkStore>(() => ({ pending: null }));

/** `country` is an ISO 3166-1 alpha-2 code. */
export const showCatalogWith = (filter: CatalogLinkFilter) => {
  useCatalogLink.setState({ pending: filter });
};

export const takeCatalogLink = (): CatalogLinkFilter | null => {
  const { pending } = useCatalogLink.getState();
  if (pending) useCatalogLink.setState({ pending: null });
  return pending;
};

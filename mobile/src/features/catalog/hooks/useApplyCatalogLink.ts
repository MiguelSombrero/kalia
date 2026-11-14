import { useEffect } from "react";
import { useCatalogLink } from "@/lib/catalogLink";
import { useFiltersStore } from "../filters/store";

export const useApplyCatalogLink = () => {
  const pending = useCatalogLink((state) => state.pending);
  const take = useCatalogLink((state) => state.take);
  const showOnly = useFiltersStore((state) => state.showOnly);
  useEffect(() => {
    if (!pending) return;
    const filter = take();
    if (filter) showOnly(filter);
  }, [pending, take, showOnly]);
};

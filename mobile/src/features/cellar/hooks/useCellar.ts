import { queryOptions, useQuery } from "@tanstack/react-query";

import { readCellar } from "../api";

export const cellarQuery = () => queryOptions({ queryKey: ["cellar", "entries"], queryFn: readCellar });

export const useCellar = () => useQuery(cellarQuery());

// An entry is drawn from the list's read: the observer the entry's screen adds must not ask again for what the list holds.
export const useCellarEntry = (id: string, enabled: boolean) =>
  useQuery({ ...cellarQuery(), enabled, refetchOnMount: false, select: (entries) => entries.find((entry) => entry.id === id) ?? null });

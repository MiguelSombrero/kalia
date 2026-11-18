import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";

import type { BreweryOption, EditOptions } from "../types";

export const editOptionsQuery = (load: (locale: string) => Promise<EditOptions>, locale: string) =>
  queryOptions({
    queryKey: ["admin-suggestions", "editOptions", locale],
    queryFn: () => load(locale),
    staleTime: Infinity,
  });

export const breweryMatchesQuery = (
  find: (query: string, locale: string) => Promise<BreweryOption[]>,
  query: string,
  locale: string,
) =>
  queryOptions({
    queryKey: ["admin-suggestions", "breweries", locale, query],
    queryFn: () => find(query, locale),
    enabled: query.trim() !== "",
    placeholderData: keepPreviousData,
  });

export const useEditOptions = (load: (locale: string) => Promise<EditOptions>, locale: string) =>
  useQuery(editOptionsQuery(load, locale));

export const useBreweryMatches = (
  find: (query: string, locale: string) => Promise<BreweryOption[]>,
  query: string,
  locale: string,
) => useQuery(breweryMatchesQuery(find, query, locale));

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { BreweryOption, EditOptions } from "../types";

const adminKey = ["admin-suggestions"] as const;

export const useEditOptions = (load: (locale: string) => Promise<EditOptions>, locale: string) =>
  useQuery({ queryKey: [...adminKey, "editOptions", locale], queryFn: () => load(locale), staleTime: Infinity });

export const useBreweryMatches = (
  find: (query: string, locale: string) => Promise<BreweryOption[]>,
  query: string,
  locale: string,
) =>
  useQuery({
    queryKey: [...adminKey, "breweries", locale, query],
    queryFn: () => find(query, locale),
    enabled: query.trim() !== "",
    placeholderData: keepPreviousData,
  });

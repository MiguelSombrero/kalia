import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { readBreweryCountries, readBreweryPage, readResultCount, readStyles } from "../api";
import { type Filters, searchParams } from "../filters/model";
import { useDebounced } from "./useDebounced";

const FILTER_OPTION_RETRIES = 3;

export const useStyleOptions = (enabled: boolean) =>
  useQuery({
    queryKey: ["catalog", "styles"],
    queryFn: readStyles,
    enabled,
    // eslint-disable-next-line no-restricted-syntax -- the sheet shows no error for a list that fails to load, so it retries quietly instead of failing at once
    retry: FILTER_OPTION_RETRIES,
  });

export const useCountryOptions = (enabled: boolean) =>
  useQuery({
    queryKey: ["catalog", "countries"],
    queryFn: readBreweryCountries,
    enabled,
    // eslint-disable-next-line no-restricted-syntax -- as for the styles
    retry: FILTER_OPTION_RETRIES,
  });

export const useBreweryOptions = (query: string, enabled: boolean) => {
  const settled = useDebounced(query);
  return useInfiniteQuery({
    queryKey: ["catalog", "breweries", settled],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => readBreweryPage(settled, pageParam),
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    enabled,
    placeholderData: (previous) => previous,
    // eslint-disable-next-line no-restricted-syntax -- as for the styles
    retry: FILTER_OPTION_RETRIES,
  });
};

/** Asked once the choices pause, not per keystroke: the edge limits requests per address (ADR-0090). While they change, `settling` is true and the count is not the draft's. */
export const useResultCount = (filters: Filters) => {
  const settled = useDebounced(filters);
  const params = searchParams(settled);
  const count = useQuery({
    queryKey: ["catalog", "count", params],
    queryFn: () => readResultCount(params),
    placeholderData: (previous) => previous,
    // eslint-disable-next-line no-restricted-syntax -- as for the styles
    retry: FILTER_OPTION_RETRIES,
  });
  return { data: settled === filters ? count.data : undefined };
};

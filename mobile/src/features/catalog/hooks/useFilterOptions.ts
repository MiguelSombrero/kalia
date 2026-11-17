import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { readBreweryCountries, readBreweryPage, readResultCount, readStyles } from "../api";
import { type Filters, searchParams } from "../filters/model";
import { useDebounced } from "./useDebounced";

const FILTER_OPTION_RETRIES = 3;

export const styleOptionsQuery = () =>
  queryOptions({
    queryKey: ["catalog", "styles"],
    queryFn: readStyles,
    // eslint-disable-next-line no-restricted-syntax -- the sheet shows no error for a list that fails to load, so it retries quietly instead of failing at once
    retry: FILTER_OPTION_RETRIES,
  });

export const countryOptionsQuery = () =>
  queryOptions({
    queryKey: ["catalog", "countries"],
    queryFn: readBreweryCountries,
    // eslint-disable-next-line no-restricted-syntax -- as for the styles
    retry: FILTER_OPTION_RETRIES,
  });

export const breweryOptionsQuery = (query: string) =>
  infiniteQueryOptions({
    queryKey: ["catalog", "breweries", query],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => readBreweryPage(query, pageParam),
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    placeholderData: (previous) => previous,
    // eslint-disable-next-line no-restricted-syntax -- as for the styles
    retry: FILTER_OPTION_RETRIES,
  });

export const resultCountQuery = (filters: Filters) => {
  const params = searchParams(filters);
  return queryOptions({
    queryKey: ["catalog", "count", params],
    queryFn: () => readResultCount(params),
    placeholderData: (previous) => previous,
    // eslint-disable-next-line no-restricted-syntax -- as for the styles
    retry: FILTER_OPTION_RETRIES,
  });
};

export const useStyleOptions = (enabled: boolean) => useQuery({ ...styleOptionsQuery(), enabled });

export const useCountryOptions = (enabled: boolean) => useQuery({ ...countryOptionsQuery(), enabled });

export const useBreweryOptions = (query: string, enabled: boolean) => {
  const settled = useDebounced(query);
  return useInfiniteQuery({ ...breweryOptionsQuery(settled), enabled });
};

/** Asked once the choices pause, not per keystroke: the edge limits requests per address (ADR-0090). While they change, `settling` is true and the count is not the draft's. */
export const useResultCount = (filters: Filters) => {
  const settled = useDebounced(filters);
  const count = useQuery(resultCountQuery(settled));
  return { data: settled === filters ? count.data : undefined };
};

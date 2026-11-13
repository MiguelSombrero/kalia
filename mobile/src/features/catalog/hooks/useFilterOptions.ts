import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { readBreweryCountries, readBreweryPage, readResultCount, readStyles } from "../api";
import { searchParams, type Filters } from "../filters/model";

const PAUSE_MS = 300;

export const useDebounced = <T,>(value: T): T => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
};

export const useStyleOptions = (enabled: boolean) => useQuery({ queryKey: ["catalog", "styles"], queryFn: readStyles, enabled });

export const useCountryOptions = (enabled: boolean) => useQuery({ queryKey: ["catalog", "countries"], queryFn: readBreweryCountries, enabled });

export const useBreweryOptions = (query: string, enabled: boolean) => {
  const settled = useDebounced(query);
  return useInfiniteQuery({
    queryKey: ["catalog", "breweries", settled],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => readBreweryPage(settled, pageParam),
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    enabled,
    placeholderData: (previous) => previous,
  });
};

/** Asked once the choices pause, not per keystroke: the edge limits requests per address (ADR-0090). While they change, `settling` is true and the count is not the draft's. */
export const useResultCount = (filters: Filters) => {
  const settled = useDebounced(filters);
  const params = searchParams(settled);
  const count = useQuery({ queryKey: ["catalog", "count", params], queryFn: () => readResultCount(params), placeholderData: (previous) => previous });
  return { data: settled === filters ? count.data : undefined };
};

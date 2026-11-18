import { infiniteQueryOptions, keepPreviousData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { BEER_PAGE_SIZE, MAX_RESULT_WINDOW, readBeerPage } from "../api";
import { type Filters, searchParams } from "../filters/model";
import type { BeerPage } from "../types";

export const nextBeerPage = (last: BeerPage): number | undefined => {
  const next = last.page + 1;
  return next < last.totalPages && next * BEER_PAGE_SIZE <= MAX_RESULT_WINDOW ? next : undefined;
};

export const beersQuery = (filters: Filters) => {
  const params = searchParams(filters);
  return infiniteQueryOptions({
    queryKey: ["catalog", "beers", params],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => readBeerPage(params, pageParam),
    getNextPageParam: nextBeerPage,
    placeholderData: keepPreviousData,
  });
};

export const useBeers = (filters: Filters) => {
  const options = beersQuery(filters);
  const queryClient = useQueryClient();
  const query = useInfiniteQuery(options);
  // refetch() on an infinite query reloads every loaded page; a pull to refresh reloads the first only.
  const refresh = async () => {
    const loaded = queryClient.getQueryData(options.queryKey);
    if (loaded) queryClient.setQueryData(options.queryKey, { pages: loaded.pages.slice(0, 1), pageParams: loaded.pageParams.slice(0, 1) });
    const result = await query.refetch();
    if (result.isError && loaded) queryClient.setQueryData(options.queryKey, loaded);
    return result;
  };
  const beers = useMemo(() => query.data?.pages.flatMap((page) => page.content), [query.data]);
  return { query, beers, refresh };
};

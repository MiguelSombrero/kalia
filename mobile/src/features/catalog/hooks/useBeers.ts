import { useMemo } from "react";
import { keepPreviousData, useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { BEER_PAGE_SIZE, MAX_RESULT_WINDOW, readBeerPage, type BeerPage } from "../api";
import { searchParams, type Filters } from "../filters/model";

export const nextBeerPage = (last: BeerPage): number | undefined => {
  const next = last.page + 1;
  return next < last.totalPages && next * BEER_PAGE_SIZE <= MAX_RESULT_WINDOW ? next : undefined;
};

export const useBeers = (filters: Filters) => {
  const params = searchParams(filters);
  const queryKey = ["catalog", "beers", params] as const;
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => readBeerPage(params, pageParam),
    getNextPageParam: nextBeerPage,
    placeholderData: keepPreviousData,
    retry: false,
  });
  // refetch() on an infinite query reloads every loaded page; a pull to refresh reloads the first only.
  const refresh = async () => {
    const loaded = queryClient.getQueryData<InfiniteData<BeerPage, number>>(queryKey);
    if (loaded) queryClient.setQueryData<InfiniteData<BeerPage, number>>(queryKey, { pages: loaded.pages.slice(0, 1), pageParams: loaded.pageParams.slice(0, 1) });
    const result = await query.refetch();
    if (result.isError && loaded) queryClient.setQueryData(queryKey, loaded);
    return result;
  };
  const beers = useMemo(() => query.data?.pages.flatMap((page) => page.content), [query.data]);
  return { query, beers, refresh };
};

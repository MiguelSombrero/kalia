import { useInfiniteQuery } from "@tanstack/react-query";
import { readOlderFeedAction } from "../actions";
import type { FeedPage } from "../types";

export const feedKey = ["feed"] as const;

/**
 * Continues the server-rendered first page backward, one "before" cursor at a
 * time. `initialData` alone does not stop a second read of that first page:
 * with the default `staleTime` of 0, TanStack Query treats seeded data as
 * stale immediately and refetches on mount — the three `refetchOn*` flags
 * below are what keep the server's render as the only read of page one.
 * Scrolling still works: `fetchNextPage` always fetches its new page
 * regardless of staleness.
 */
export const useOlderFeed = (initialPage: FeedPage) => {
  return useInfiniteQuery({
    queryKey: feedKey,
    queryFn: ({ pageParam }) => readOlderFeedAction(pageParam as string),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: { pages: [initialPage], pageParams: [null] },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

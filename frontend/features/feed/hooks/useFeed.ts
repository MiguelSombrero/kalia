import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { pollFeedAction, readOlderFeedAction } from "../actions";
import { LIVE_POLL_INTERVAL_MS } from "../constants";
import type { FeedPage } from "../types";

export const feedKey = ["feed"] as const;
export const pollFeedKey = ["feed", "poll"] as const;

const EMPTY_POLL_RESULT: FeedPage = { content: [], nextCursor: undefined, startOver: false };

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

/**
 * Polls for events after `since` on an interval. TanStack Query's own
 * `refetchInterval` already skips the actual fetch while the tab is hidden
 * (`refetchIntervalInBackground` defaults to false) and `refetchOnWindowFocus`
 * already re-fetches the moment it is focused again — this hook adds nothing
 * of its own for that behaviour, per ADR-0060's "no hand-rolled visibility
 * listener" seam. `staleTime: 0` overrides the QueryClient's 60s default
 * (ADR-0008) so a focus regain always re-fetches rather than only when the
 * default staleTime has also elapsed. `retry: false` keeps each interval tick
 * to exactly one attempt rather than spending it on that tick's own retries.
 * `failureCount` is *not* a consecutive-ticks counter — it resets to 0 at the
 * start of every attempt (it counts one attempt's own retries) — so
 * `consecutiveFailures` below tracks it from `dataUpdatedAt`/`errorUpdatedAt`
 * instead, each of which changes exactly once per attempt regardless of
 * outcome.
 *
 * `since` is read through a ref, not a query-key dependency: the caller
 * advances it as new events are consumed, and folding it into the key would
 * restart the interval on every arrival instead of polling continuously —
 * the same reason FeedList.tsx reads fetchNextPage/isFetchingNextPage through
 * a ref rather than an effect dependency. The queryFn deliberately does not
 * depend on the queryKey for this.
 */
export const usePollFeed = (since: string) => {
  const sinceRef = useRef(since);
  useEffect(() => {
    sinceRef.current = since;
  }, [since]);

  // eslint-disable-next-line @tanstack/query/exhaustive-deps -- since is deliberately kept out of the key, see the doc comment above
  const query = useQuery({
    queryKey: pollFeedKey,
    queryFn: () => pollFeedAction(sinceRef.current),
    initialData: EMPTY_POLL_RESULT,
    staleTime: 0,
    retry: false,
    refetchInterval: LIVE_POLL_INTERVAL_MS,
    refetchOnMount: false,
    // Pinned rather than left at the library default: the catch-up-on-focus
    // half of this hook's contract depends on it, and a later app-wide
    // default change elsewhere must not silently take it away here.
    refetchOnWindowFocus: true,
    refetchOnReconnect: false,
  });

  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const lastErrorUpdatedAt = useRef(query.errorUpdatedAt);
  const lastDataUpdatedAt = useRef(query.dataUpdatedAt);
  useEffect(() => {
    if (query.errorUpdatedAt !== lastErrorUpdatedAt.current) {
      lastErrorUpdatedAt.current = query.errorUpdatedAt;
      setConsecutiveFailures((prev) => prev + 1);
    }
    if (query.dataUpdatedAt !== lastDataUpdatedAt.current) {
      lastDataUpdatedAt.current = query.dataUpdatedAt;
      setConsecutiveFailures(0);
    }
  }, [query.dataUpdatedAt, query.errorUpdatedAt]);

  return { data: query.data, refetch: query.refetch, consecutiveFailures };
};

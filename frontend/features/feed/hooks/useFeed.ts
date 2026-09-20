import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { pollFeedAction, readOlderFeedAction, type OlderFeedPage } from "../actions";
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
 *
 * `useId()` scopes the key to this mount. The app's QueryClient
 * (app/providers.tsx) outlives a client-side navigation, so a visitor who
 * leaves the front page and returns within TanStack Query's gcTime (default
 * 5 minutes, unset here) would otherwise remount onto the *previous* mount's
 * cache entry — `initialData` only seeds a query that doesn't already exist,
 * so the freshly server-rendered `initialPage` passed in below would be
 * silently discarded in favour of whatever was scrolled to last time.
 */
export const useOlderFeed = (initialPage: FeedPage) => {
  const mountId = useId();
  return useInfiniteQuery<OlderFeedPage>({
    queryKey: [...feedKey, mountId],
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
 * `refetchIntervalInBackground` defaults to false, so TanStack Query itself
 * already skips fetching while the tab is hidden and catches up on focus
 * regain (ADR-0060: no hand-rolled visibility listener). `staleTime: 0`
 * overrides the QueryClient's 60s default (ADR-0008) — a focus-triggered
 * refetch only fires when data is stale, so without this a focus regain
 * inside that 60s window would silently do nothing.
 *
 * `failureCount` is *not* a consecutive-ticks counter: it resets to 0 at the
 * start of every attempt, so `consecutiveFailures` below tracks it from
 * `dataUpdatedAt`/`errorUpdatedAt` instead.
 *
 * `since` is read through a ref rather than a query-key dependency: changing
 * the key would restart TanStack Query's interval scheduling on every
 * arrival instead of polling continuously. `useId()`, unlike `since`, *is*
 * folded into the key — same per-mount reason as useOlderFeed above, subtler
 * failure mode: left unscoped, a remount within gcTime would reuse the
 * previous mount's cached response, and the effect in FeedList.tsx that
 * advances `sinceCursor` from `poll.data` would rewind it behind the fresh
 * SSR page's own cursor.
 */
export const usePollFeed = (since: string) => {
  const mountId = useId();
  const sinceRef = useRef(since);
  useEffect(() => {
    sinceRef.current = since;
  }, [since]);

  // eslint-disable-next-line @tanstack/query/exhaustive-deps -- since is deliberately kept out of the key, see the doc comment above
  const query = useQuery({
    queryKey: [...pollFeedKey, mountId],
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

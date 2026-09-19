"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/card";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { FeedLineRow } from "./FeedLineRow";
import { FEED_LIST_CAP, STALLED_AFTER_FAILURES } from "./constants";
import { useOlderFeed, usePollFeed } from "./hooks/useFeed";
import type { FeedLine, FeedPage } from "./types";

type Props = { locale: Locale; now: string; initialPage: FeedPage; emptyState: ReactNode };

/**
 * The server-rendered first page, continued backward as the visitor scrolls
 * and forward as new events poll in. `now` is threaded in from the server
 * render rather than read afresh here — see lib/relativeInstant.ts's caller
 * contract for why a second `new Date()` would diverge from what was already
 * painted. `emptyState` is rendered by this component rather than its caller
 * (`page.tsx`) precisely because it must keep polling and can transition out
 * of empty on its own — a page that starts with nothing yet is exactly the
 * case where staying live matters most.
 */
export const FeedList = ({ locale, now, initialPage, emptyState }: Props) => {
  const { t } = useTranslation();
  const [renderedAt] = useState(() => new Date(now));
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useOlderFeed(initialPage);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Read inside the observer callback instead of the effect's own closure:
  // an IntersectionObserver reports the sentinel's current state as soon as
  // it is observed, even with nothing new to report, so recreating one on
  // every isFetchingNextPage flip (start AND finish) re-fires immediately —
  // and on finish, a still-visible sentinel would fetch again with no scroll
  // in between. Depending on canLoadMore alone keeps the observer stable
  // across a fetch's whole lifetime. Updated in its own effect, never during
  // render, since refs are for after-render reads only.
  const latestFetch = useRef({ isFetchingNextPage, fetchNextPage });
  useEffect(() => {
    latestFetch.current = { isFetchingNextPage, fetchNextPage };
  }, [isFetchingNextPage, fetchNextPage]);

  const historyLines = data.pages.flatMap((page) => page.content);

  const [sinceCursor, setSinceCursor] = useState(() => initialPage.content[0]?.cursor ?? "");
  const [pendingLines, setPendingLines] = useState<FeedLine[]>([]);
  const [revealedLines, setRevealedLines] = useState<FeedLine[]>([]);
  const poll = usePollFeed(sinceCursor);

  // Every currently known cursor, so a redelivered event (ADR-0060: delivery
  // is at-least-once) is dropped rather than rendered twice. Synced after
  // render, ahead of the effect below in source order, rather than computed
  // inside that effect's closure — the same ref-after-render shape as
  // latestFetch above.
  const knownCursors = useRef<Set<string>>(new Set());
  useEffect(() => {
    knownCursors.current = new Set(
      [...historyLines, ...revealedLines, ...pendingLines].map((line) => line.cursor),
    );
  }, [historyLines, revealedLines, pendingLines]);

  useEffect(() => {
    if (poll.data.startOver) {
      // The cursor has aged past the served window: there is no partial
      // catch-up for this, only a fresh first page.
      window.location.reload();
      return;
    }
    if (poll.data.content.length === 0) {
      return;
    }
    const fresh = poll.data.content.filter((line) => !knownCursors.current.has(line.cursor));
    if (fresh.length > 0) {
      setPendingLines((prev) => [...fresh, ...prev].slice(0, FEED_LIST_CAP));
    }
    setSinceCursor(poll.data.nextCursor ?? poll.data.content[0]!.cursor);
  }, [poll.data]);

  const revealPending = () => {
    setRevealedLines((prev) => [...pendingLines, ...prev].slice(0, FEED_LIST_CAP));
    setPendingLines([]);
  };

  // Counts consecutive failed ticks itself: poll.failureCount resets to 0 at
  // the start of every attempt (it counts one attempt's own retries, moot
  // here since retry is off), not across the separate attempts a recurring
  // interval makes.
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const lastErrorUpdatedAt = useRef(poll.errorUpdatedAt);
  const lastDataUpdatedAt = useRef(poll.dataUpdatedAt);
  useEffect(() => {
    if (poll.errorUpdatedAt !== lastErrorUpdatedAt.current) {
      lastErrorUpdatedAt.current = poll.errorUpdatedAt;
      setConsecutiveFailures((prev) => prev + 1);
    }
    if (poll.dataUpdatedAt !== lastDataUpdatedAt.current) {
      lastDataUpdatedAt.current = poll.dataUpdatedAt;
      setConsecutiveFailures(0);
    }
  }, [poll.dataUpdatedAt, poll.errorUpdatedAt]);

  const isStalled = consecutiveFailures >= STALLED_AFTER_FAILURES;
  const lines = [...revealedLines, ...historyLines].slice(0, FEED_LIST_CAP);
  const canLoadMore = hasNextPage && lines.length < FEED_LIST_CAP;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !canLoadMore) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !latestFetch.current.isFetchingNextPage) {
        latestFetch.current.fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canLoadMore]);

  return (
    <div className="flex flex-col gap-4">
      {pendingLines.length > 0 && (
        <div role="status">
          <Button type="button" variant="outline" onClick={revealPending}>
            {t("feed.live.newEvents", { count: pendingLines.length })}
          </Button>
        </div>
      )}
      {lines.length === 0 ? (
        emptyState
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {lines.map((line) => (
              <FeedLineRow key={line.cursor} line={line} locale={locale} now={renderedAt} />
            ))}
          </ul>
          {canLoadMore && (
            <div ref={sentinelRef} role="status" className="py-2 text-center text-sm text-muted-foreground">
              {isFetchingNextPage && t("feed.loadingMore")}
            </div>
          )}
        </>
      )}
      {isStalled && (
        <div
          role="status"
          className={cn(cardVariants, "flex items-center justify-between gap-4 p-4 text-sm text-foreground")}
        >
          <span>{t("feed.live.stalled")}</span>
          <Button type="button" variant="outline" onClick={() => poll.refetch()}>
            {t("feed.live.retry")}
          </Button>
        </div>
      )}
    </div>
  );
};

"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

const capped = (lines: FeedLine[]): FeedLine[] => lines.slice(0, FEED_LIST_CAP);

/**
 * The server-rendered first page, continued backward as the visitor scrolls
 * and forward as new events poll in. `now` is threaded in from the server
 * render rather than read afresh here — see lib/relativeInstant.ts's caller
 * contract for why a second `new Date()` would diverge from what was already
 * painted. `emptyState` is rendered here rather than by `page.tsx` choosing
 * between this component and it: a feed that starts empty must keep polling
 * and can still go live on its own, which page.tsx alone deciding cannot do.
 */
export const FeedList = ({ locale, now, initialPage, emptyState }: Props) => {
  const { t } = useTranslation();
  const [renderedAt] = useState(() => new Date(now));
  const { data, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } =
    useOlderFeed(initialPage);
  // A permanently invalid cursor arrives via `data`, not `error` — actions.ts
  // resolves it into the last page instead of throwing (see OlderFeedPage).
  // Its empty nextCursor already turns hasNextPage off, so the sentinel needs
  // no separate handling to stop retrying.
  const isOlderCursorExpired = data.pages.at(-1)?.cursorExpired === true;
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

  const historyLines = useMemo(() => data.pages.flatMap((page) => page.content), [data.pages]);

  const [sinceCursor, setSinceCursor] = useState(() => initialPage.content[0]?.cursor ?? "");
  const [pendingLines, setPendingLines] = useState<FeedLine[]>([]);
  const [revealedLines, setRevealedLines] = useState<FeedLine[]>([]);
  const poll = usePollFeed(sinceCursor);

  // ADR-0060: delivery is at-least-once, so a redelivered event must be
  // dropped rather than rendered twice. This effect must run before the one
  // below in source order, since that one reads knownCursors.current
  // synchronously rather than depending on it.
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
    if (poll.data.content.length > 0) {
      const fresh = poll.data.content.filter((line) => !knownCursors.current.has(line.cursor));
      if (fresh.length > 0) {
        setPendingLines((prev) => capped([...fresh, ...prev]));
      }
    }
    // A batch can be empty with a cursor still attached: every line in it
    // resolved to a cellar that isn't public any more, filtered out after
    // the page was already sized. Advancing past it is what lets the next
    // poll reach whatever real event comes after, rather than re-reading
    // the same filtered batch forever.
    if (poll.data.content.length > 0 || poll.data.nextCursor) {
      setSinceCursor(poll.data.nextCursor ?? poll.data.content[0]!.cursor);
    }
  }, [poll.data]);

  const revealPending = () => {
    setRevealedLines((prev) => capped([...pendingLines, ...prev]));
    setPendingLines([]);
  };

  const isStalled = poll.consecutiveFailures >= STALLED_AFTER_FAILURES;
  const lines = useMemo(() => capped([...revealedLines, ...historyLines]), [revealedLines, historyLines]);
  // `lines.length > 0` is part of the condition, not just the cap: the
  // sentinel only ever renders alongside a non-empty list (below), and
  // without this term here too, a feed that starts empty with more history
  // behind it (every recent line filtered out, but `hasNextPage` true) would
  // have `canLoadMore` already `true` before it has anything on screen —
  // this effect's dependency would then see no change, and never re-run,
  // when the list later gains its first line and the sentinel actually mounts.
  const canLoadMore = hasNextPage && lines.length > 0 && lines.length < FEED_LIST_CAP;

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
        // Never alongside the control above: "Nothing here yet" beside "1 new
        // event" would tell the visitor two contradictory things at once.
        pendingLines.length === 0 && emptyState
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
      {(isFetchNextPageError || isOlderCursorExpired) && (
        <div
          role="status"
          className={cn(cardVariants, "flex items-center justify-between gap-4 p-4 text-sm text-foreground")}
        >
          <span>{t(isOlderCursorExpired ? "feed.older.cursorExpired" : "feed.older.failed")}</span>
          <Button
            type="button"
            variant="outline"
            onClick={isOlderCursorExpired ? () => window.location.reload() : () => fetchNextPage()}
          >
            {t(isOlderCursorExpired ? "feed.older.reload" : "feed.older.retry")}
          </Button>
        </div>
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

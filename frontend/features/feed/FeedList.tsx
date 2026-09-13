"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Locale } from "@/i18n/settings";
import { FeedLineRow } from "./FeedLineRow";
import { useOlderFeed } from "./hooks/useFeed";
import type { FeedPage } from "./types";

type Props = { locale: Locale; now: string; initialPage: FeedPage };

/**
 * The server-rendered first page, continued backward as the visitor scrolls.
 * `now` is threaded in from the server render rather than read afresh here —
 * see lib/relativeInstant.ts's caller contract for why a second `new Date()`
 * would diverge from what was already painted.
 */
export const FeedList = ({ locale, now, initialPage }: Props) => {
  const { t } = useTranslation();
  const [renderedAt] = useState(() => new Date(now));
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useOlderFeed(initialPage);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Read inside the observer callback instead of the effect's own closure:
  // an IntersectionObserver reports the sentinel's current state as soon as
  // it is observed, even with nothing new to report, so recreating one on
  // every isFetchingNextPage flip (start AND finish) re-fires immediately —
  // and on finish, a still-visible sentinel would fetch again with no scroll
  // in between. Depending on hasNextPage alone keeps the observer stable
  // across a fetch's whole lifetime. Updated in its own effect, never during
  // render, since refs are for after-render reads only.
  const latestFetch = useRef({ isFetchingNextPage, fetchNextPage });
  useEffect(() => {
    latestFetch.current = { isFetchingNextPage, fetchNextPage };
  }, [isFetchingNextPage, fetchNextPage]);

  const lines = data.pages.flatMap((page) => page.content);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !latestFetch.current.isFetchingNextPage) {
        latestFetch.current.fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage]);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <FeedLineRow key={line.cursor} line={line} locale={locale} now={renderedAt} />
        ))}
      </ul>
      {hasNextPage && (
        <div ref={sentinelRef} role="status" className="py-2 text-center text-sm text-muted-foreground">
          {isFetchingNextPage && t("feed.loadingMore")}
        </div>
      )}
    </div>
  );
};

"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { BeerSlot } from "@/components/ui/beer-slot";
import { PersonSlot } from "@/components/ui/person-slot";
import { RelativeTime } from "@/components/ui/relative-time";
import type { Locale } from "@/i18n/settings";
import { formatAbv } from "@/lib/abv";
import { cn } from "@/lib/cn";
import type { FeedLine } from "./types";
import { vintageYear } from "./vintage";

export const feedRowFrame =
  "grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-start gap-x-4 border-b border-divider py-4 md:grid-cols-[8.5rem_minmax(0,1fr)_auto]";

type Props = { line: FeedLine; locale: Locale; now: Date; isOwn?: boolean; isFresh?: boolean };

export const FeedLineRow = ({ line, locale, now, isOwn = false, isFresh = false }: Props) => {
  const { t } = useTranslation();
  const vintage = vintageYear(line.brewedDate);

  return (
    <li className={cn(feedRowFrame, isFresh && "motion-safe:animate-feed-reveal")}>
      <BeerSlot variant="band" beerStyle={line.style} abv={line.abv} locale={locale} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <PersonSlot username={line.username} size="xs" />
          <p className="min-w-0 text-sm text-foreground">
            <Link
              href={`/cellars/${line.username}`}
              className="inline-block max-w-full py-0.5 font-semibold wrap-anywhere text-foreground hover:underline hover:underline-offset-2"
            >
              {line.username}
            </Link>
            {isOwn && (
              <Badge variant="accent" className="ml-1.5 px-1.5 py-0">
                {t("feed.line.you")}
              </Badge>
            )}
            <span className="sr-only"> {t("feed.line.added", { count: line.quantity })}</span>
            <span className="text-muted-foreground">
              {" · "}
              <RelativeTime instant={line.occurredAt} locale={locale} now={now} />
            </span>
          </p>
        </div>
        <Link
          href={`/${locale}/beers/${line.beerId}`}
          className="self-start py-px text-lg/snug font-bold text-foreground hover:underline hover:underline-offset-2 md:text-xl/snug"
        >
          {line.beerName}
        </Link>
        <p className="text-sm text-muted-foreground">
          {line.brewery} · {line.style}
          <span className="sr-only">, {formatAbv(line.abv, locale)}</span>
          {vintage && ` · ${t("feed.line.vintage", { vintage })}`}
        </p>
      </div>
      <div aria-hidden="true" className="flex flex-col items-end self-center">
        <span className="font-display text-3xl/none font-extrabold tabular-nums text-foreground md:text-4xl/none">
          {line.quantity}
        </span>
        <span className="mt-1 text-label font-semibold uppercase text-muted-foreground">
          {t("feed.line.bottles", { count: line.quantity })}
        </span>
      </div>
    </li>
  );
};

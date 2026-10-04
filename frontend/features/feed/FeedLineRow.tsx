"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { PersonSlot } from "@/components/ui/person-slot";
import { RelativeTime } from "@/components/ui/relative-time";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import type { FeedLine } from "./types";
import { vintageYear } from "./vintage";

export const feedRowFrame = "flex items-start gap-3.5 border-b border-divider py-4";

type Props = { line: FeedLine; locale: Locale; now: Date; isOwn?: boolean; isFresh?: boolean };

export const FeedLineRow = ({ line, locale, now, isOwn = false, isFresh = false }: Props) => {
  const { t } = useTranslation();
  const vintage = vintageYear(line.brewedDate);

  return (
    <li className={cn(feedRowFrame, isFresh && "motion-safe:animate-feed-reveal")}>
      <PersonSlot username={line.username} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm text-foreground">
          <Link
            href={`/cellars/${line.username}`}
            className="inline-block py-0.5 font-semibold text-foreground hover:underline hover:underline-offset-2"
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
        <Link
          href={`/${locale}/beers?query=${encodeURIComponent(line.beerName)}`}
          className="self-start py-px text-lg/snug font-bold text-foreground hover:underline hover:underline-offset-2 md:text-xl/snug"
        >
          {line.beerName}
        </Link>
        <p className="text-sm text-muted-foreground">
          {line.brewery}
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

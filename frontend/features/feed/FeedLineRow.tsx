"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { cardVariants } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import type { FeedLine } from "./types";
import { vintageYear } from "./vintage";

type Props = { line: FeedLine; locale: Locale; now: Date };

export const FeedLineRow = ({ line, locale, now }: Props) => {
  const { t } = useTranslation();
  const vintage = vintageYear(line.brewedDate);
  const key = vintage ? "feed.line.withVintage" : "feed.line.withoutVintage";

  return (
    <li className={cn(cardVariants, "flex flex-col gap-1 p-4 text-sm text-foreground")}>
      <p>
        <Link
          href={`/cellars/${line.username}`}
          className="font-medium text-foreground underline underline-offset-2"
        >
          {line.username}
        </Link>{" "}
        {t(key, { count: line.quantity, vintage, beerName: line.beerName })}
      </p>
      <span className="text-xs text-muted-foreground">
        <RelativeTime instant={line.occurredAt} locale={locale} now={now} />
      </span>
    </li>
  );
};

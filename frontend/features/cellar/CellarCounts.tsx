"use client";

import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/settings";
import { isPastBestBefore } from "./bottleTime";
import type { CellarTotals } from "./cellarTotals";
import { useLocalToday } from "./hooks/useLocalToday";
import { isBottleHidden, useBottleRemovalStore } from "./store";
import type { CellarBeer } from "./types";

/**
 * "N beers · N bottles", then how many bottles are past their best-before on
 * the visitor's local day, which is known only once the page has hydrated.
 */
export const CellarCounts = ({
  beers,
  lastAdded,
  wholeCellar,
  locale,
}: {
  beers: CellarBeer[];
  /** The newest bottle's `createdAt`, shown on a public cellar. */
  lastAdded?: string;
  /** What the whole cellar holds, when `beers` is only one page of it: the past-best-before count is then left out. */
  wholeCellar?: CellarTotals;
  locale: Locale;
}) => {
  const { t } = useTranslation();
  const today = useLocalToday();
  const removing = useBottleRemovalStore((state) => state.removing);
  const shown = beers
    .map((beer) => beer.bottles.filter((bottle) => !isBottleHidden(removing, bottle.id)))
    .filter((bottles) => bottles.length > 0);
  const bottles = shown.flat();
  const totals = wholeCellar ?? { beers: shown.length, bottles: bottles.length };
  const past = wholeCellar || today === null ? 0 : bottles.filter((bottle) => isPastBestBefore(bottle, today)).length;

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-foreground">
      <span>
        {t("cellar.count.beers", { count: totals.beers })} · {t("cellar.entry.bottleCount", { count: totals.bottles })}
      </span>
      {past > 0 && <Badge variant="ink">{t("cellar.pastBestBefore", { count: past })}</Badge>}
      {lastAdded && today && (
        <span className="text-muted-foreground">
          {t("cellar.public.lastAdded", {
            date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(lastAdded)),
          })}
        </span>
      )}
    </p>
  );
};

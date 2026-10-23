"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { BeerSlot } from "@/components/ui/beer-slot";
import type { Locale } from "@/i18n/settings";
import { formatAbv } from "@/lib/abv";
import { useBreweryBeers } from "./hooks/useAddBeer";
import { beerHref } from "./links";
import { similarlyNamed } from "./similarNames";

/** The picked brewery's beers named like the one being added (ADR-0082). */
export const SimilarBeers = ({
  locale,
  breweryId,
  breweryName,
  beerName,
}: {
  locale: Locale;
  breweryId: string;
  breweryName: string;
  beerName: string;
}) => {
  const { t } = useTranslation();
  const beers = useBreweryBeers(breweryId);
  const similar = similarlyNamed(beerName, beers.data ?? []);

  return (
    <section aria-live="polite" aria-label={t("catalog.add.similarHeading", { brewery: breweryName })}>
      {similar.length > 0 && (
        <div className="rounded-surface border border-border bg-surface-sunken px-4 py-3">
          <p className="text-label font-semibold uppercase text-foreground">
            {t("catalog.add.similarHeading", { brewery: breweryName })}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("catalog.add.similarHint")}</p>
          <ul className="mt-2">
            {similar.map((beer) => (
              <li key={beer.id} className="flex items-center gap-3 border-t border-divider py-2 first:border-t-0">
                <BeerSlot variant="strip" beerStyle={beer.style} className="h-5 self-center" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold text-foreground">{beer.name}</span>{" "}
                  <span className="text-muted-foreground">
                    · {beer.style} · {formatAbv(beer.abv, locale)}
                  </span>
                </span>
                <Link
                  href={beerHref(locale, beer.id)}
                  aria-label={t("catalog.add.openFor", { beer: beer.name })}
                  className="text-sm text-foreground underline underline-offset-2 hover:text-primary"
                >
                  {t("catalog.add.open")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

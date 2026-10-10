"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/ui/button";
import { BeerSlot } from "@/components/ui/beer-slot";
import { Icon } from "@/components/ui/icon";
import type { Locale } from "@/i18n/settings";
import { formatAbv } from "@/lib/abv";
import { AddBottleDialog } from "./AddBottleDialog";
import { BottleTile } from "./BottleTile";
import { cellarSorts, type CellarSort, sortCellar, toCellarSort } from "./cellarOrder";
import { beerBlock, bottleTiles, cellarTools } from "./layout";
import { RemovalOutcomeToast } from "./RemovalOutcomeToast";
import { isBottleHidden, useBottleRemovalStore } from "./store";
import type { CellarBeer } from "./types";

const fieldClasses = "w-full rounded-control border border-border bg-surface px-3 py-2 text-foreground";

/**
 * The beers of one cellar, owner's or public, in the order the URL's `sort`
 * names. Do not swap the in-place URL rewrite for a navigation: that refetches
 * the cellar from the server and drops focus from the control (ADR-0070).
 */
export const CellarBeerList = ({
  locale,
  beers,
  owner,
}: {
  locale: Locale;
  beers: CellarBeer[];
  owner: boolean;
}) => {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const sort = toCellarSort(searchParams.get("sort"));
  const sortId = useId();

  const changeSort = (next: CellarSort) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", next);
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  return (
    <>
      <div className={cellarTools}>
        <div className="flex min-w-48 flex-col gap-1">
          <label htmlFor={sortId} className="text-label font-semibold uppercase text-foreground">
            {t("cellar.sort.label")}
          </label>
          <select
            id={sortId}
            value={sort}
            onChange={(event) => changeSort(toCellarSort(event.target.value))}
            className={fieldClasses}
          >
            {cellarSorts.map((option) => (
              <option key={option} value={option}>
                {t(`cellar.sort.${option}`)}
              </option>
            ))}
          </select>
        </div>
        {owner && (
          <Link href={`/${locale}/beers`} className={buttonVariants("outline")}>
            <Icon name="plus" className="size-4" />
            {t("cellar.findBeers")}
          </Link>
        )}
      </div>
      <div className="border-t border-border">
        {sortCellar(beers, sort, locale).map((beer) => (
          <CellarBeerBlock key={beer.entryId} locale={locale} beer={beer} owner={owner} />
        ))}
      </div>
      {owner && <RemovalOutcomeToast />}
    </>
  );
};

const CellarBeerBlock = ({ locale, beer, owner }: { locale: Locale; beer: CellarBeer; owner: boolean }) => {
  const { t } = useTranslation();
  const headingId = useId();
  const removing = useBottleRemovalStore((state) => state.removing);

  // Optimistic overlay for an in-flight DELETE: a bottle disappears the moment
  // its removal is confirmed, and the beer with it once none are left.
  const bottles = beer.bottles.filter((bottle) => !isBottleHidden(removing, bottle.id));
  if (bottles.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={headingId} className={beerBlock}>
      <BeerSlot
        variant="band"
        beerStyle={beer.style}
        abv={beer.abv}
        locale={locale}
        className="hidden self-start md:block"
      />
      <BeerSlot variant="strip" beerStyle={beer.style} className="md:hidden" />
      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <h2 id={headingId} className="text-xl/snug font-bold text-foreground">
            <Link
              href={`/${locale}/beers/${beer.beerId}`}
              className="inline-block py-0.5 hover:text-primary hover:underline hover:underline-offset-2"
            >
              {beer.beerName}
            </Link>
          </h2>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {t("cellar.entry.bottleCount", { count: bottles.length })}
          </span>
          <p className="order-last basis-full text-sm text-muted-foreground">
            {beer.breweryName} · {beer.style} · <span className="tabular-nums">{formatAbv(beer.abv, locale)}</span>
          </p>
        </div>
        <ul aria-label={t("cellar.bottle.list", { beer: beer.beerName })} className={bottleTiles}>
          {bottles.map((bottle, index) => (
            <BottleTile
              key={bottle.id}
              locale={locale}
              bottle={bottle}
              number={index + 1}
              beerName={beer.beerName}
              owner={owner}
              lastBottle={bottles.length === 1}
            />
          ))}
          {owner && (
            <li className="flex">
              <AddBottleDialog beerId={beer.beerId} beerName={beer.beerName} trigger="tile" />
            </li>
          )}
        </ul>
      </div>
    </section>
  );
};

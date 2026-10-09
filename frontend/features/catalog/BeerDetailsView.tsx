import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { BeerSlot } from "@/components/ui/beer-slot";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { formatAbv } from "@/lib/abv";
import { beerStyleGroup } from "@/lib/beerStyle";
import { catalogTitle, detailsHead, factRow } from "./layout";
import { catalogHref } from "./links";
import type { BeerDetails } from "./types";

const breweryLocation = (city: string | undefined, country: string): string => {
  return city ? `${city}, ${country}` : country;
};

const factLinkCell = "col-start-2 justify-self-start md:col-start-3";
const factLink = "inline-block py-1.5 text-sm underline underline-offset-2 hover:text-primary";

export const BeerDetailsView = async ({
  locale,
  beer,
  styleCount,
  countryCount,
  heldBottles = 0,
  actions,
}: {
  locale: Locale;
  beer: BeerDetails;
  /** How many catalog beers share this one's style and its brewery's country. */
  styleCount: number;
  countryCount: number;
  heldBottles?: number;
  actions?: ReactNode;
}) => {
  const { t } = await getTranslation(locale);
  const country = beer.brewery.country;

  return (
    <article className="flex flex-col gap-8">
      <div className={detailsHead}>
        <div className="flex flex-col gap-5">
          <header className="flex flex-col gap-1.5">
            <h1 className={catalogTitle}>
              {beer.name}
            </h1>
            <p className="text-lg text-muted-foreground">
              {beer.brewery.name} — {breweryLocation(beer.brewery.city, country)}
            </p>
          </header>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {actions}
            {heldBottles > 0 && (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Badge variant="accent">{t("beer.inYourCellar", { count: heldBottles })}</Badge>
                <Link href={`/${locale}/cellar`} className="inline-block py-1 text-sm underline underline-offset-2">
                  {t("beer.openInCellar")}
                </Link>
              </p>
            )}
          </div>
        </div>
        <BeerSlot variant="band" beerStyle={beer.style} abv={beer.abv} locale={locale} />
      </div>
      <dl className="border-t border-border">
        <div className={factRow}>
          <dt className="text-muted-foreground">{t("beer.style")}</dt>
          <dd className="flex items-center gap-2 font-semibold text-foreground">
            <span
              aria-hidden="true"
              data-beer-style={beerStyleGroup(beer.style)}
              className="size-2.5 shrink-0 border border-border bg-style"
            />
            {beer.style}
          </dd>
          <dd className={factLinkCell}>
            <Link href={catalogHref(locale, { style: beer.style })} className={factLink}>
              {t("beer.allOfStyle", { style: beer.style, count: styleCount })}
            </Link>
          </dd>
        </div>
        <div className={factRow}>
          <dt className="text-muted-foreground">{t("beer.strength")}</dt>
          <dd className="font-semibold tabular-nums text-foreground">{formatAbv(beer.abv, locale)}</dd>
        </div>
        <div className={factRow}>
          <dt className="text-muted-foreground">{t("beer.brewery")}</dt>
          <dd className="font-semibold text-foreground">{beer.brewery.name}</dd>
        </div>
        <div className={factRow}>
          <dt className="text-muted-foreground">{t("beer.brewedIn")}</dt>
          <dd className="font-semibold text-foreground">{breweryLocation(beer.brewery.city, country)}</dd>
          <dd className={factLinkCell}>
            <Link href={catalogHref(locale, { country })} className={factLink}>
              {t("beer.allFromCountry", { country, count: countryCount })}
            </Link>
          </dd>
        </div>
      </dl>
    </article>
  );
};

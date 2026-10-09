import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  BeerDetailsView,
  BeerList,
  catalogHref,
  getBeer,
  hasSearch,
  parseBeerSearchParams,
  type RawSearchParams,
  searchBeers,
} from "@/features/catalog";
import { AddToCellarButton, heldBottlesByBeerOrNone } from "@/features/cellar";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { buttonVariants } from "@/components/ui/button";
import { Page } from "@/components/ui/page";
import { cn } from "@/lib/cn";

const SAME_STYLE_SHOWN = 5;

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<RawSearchParams>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  const [beer, { t }] = await Promise.all([getBeer(id), getTranslation(locale)]);
  return {
    title: beer ? `${beer.name} — ${t("app.name")}` : t("notFound.pageTitle"),
  };
};

const BeerPage = async ({ params, searchParams }: Props) => {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  const search = parseBeerSearchParams(await searchParams);
  const session = auth();
  const heldBottlesRead = session.then((current) => (current?.user ? heldBottlesByBeerOrNone() : undefined));
  const [beer, isSignedIn] = await Promise.all([getBeer(id), session.then((current) => Boolean(current?.user))]);
  if (!beer) {
    notFound();
  }
  const [{ t }, sameStyle, sameCountry, heldBottles] = await Promise.all([
    getTranslation(locale),
    searchBeers({ style: beer.style, sort: "abv,desc", size: String(SAME_STYLE_SHOWN + 1) }),
    searchBeers({ country: beer.brewery.country, size: "1" }),
    heldBottlesRead,
  ]);
  const others = sameStyle.content.filter((other) => other.id !== beer.id).slice(0, SAME_STYLE_SHOWN);
  const cameFromSearch = hasSearch(search);

  return (
    <Page width="wide">
      <Link
        href={catalogHref(locale, search)}
        className={cn(buttonVariants("outline"), "self-start")}
      >
        {cameFromSearch ? t("beer.backToResults") : t("beer.backToCatalog")}
      </Link>
      <BeerDetailsView
        locale={locale}
        beer={beer}
        styleCount={sameStyle.totalElements}
        countryCount={sameCountry.totalElements}
        heldBottles={heldBottles?.get(beer.id)}
        actions={
          <AddToCellarButton
            locale={locale}
            beerId={beer.id}
            beerName={beer.name}
            isSignedIn={isSignedIn}
          />
        }
      />
      {others.length > 0 && (
        <section aria-labelledby="same-style-heading" className="flex flex-col gap-3">
          <h2 id="same-style-heading" className="text-label font-semibold uppercase text-foreground">
            {t("beer.sameStyle", { style: beer.style })}
          </h2>
          <BeerList
            locale={locale}
            beers={others}
            search={search}
            heldBottles={heldBottles}
            headingLevel={3}
            renderActions={(other) => (
              <AddToCellarButton
                locale={locale}
                beerId={other.id}
                beerName={other.name}
                isSignedIn={isSignedIn}
                compact
              />
            )}
          />
        </section>
      )}
    </Page>
  );
};

export default BeerPage;

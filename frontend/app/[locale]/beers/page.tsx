import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  AddBeerEntry,
  BeerList,
  catalogColumns,
  catalogHref,
  hasFilters,
  JustAddedToast,
  Pagination,
  parseBeerSearchParams,
  type RawSearchParams,
  listBreweryCountries,
  ResultSummary,
  searchBeers,
  SearchFilters,
} from "@/features/catalog";
import { AddToCellarButton, heldBottlesByBeerOrNone } from "@/features/cellar";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { Page } from "@/components/ui/page";
import { PageTitle } from "@/components/ui/page-title";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const locale = toLocale((await params).locale);
  const { t } = await getTranslation(locale);
  return { title: t("catalog.pageTitle") };
};

const BeersPage = async ({ params, searchParams }: Props) => {
  const locale = toLocale((await params).locale);
  const beerParams = parseBeerSearchParams(await searchParams);
  const session = auth();
  const [result, countryCodes, signedIn, heldBottles, { t }] = await Promise.all([
    searchBeers(beerParams),
    listBreweryCountries(),
    session.then((current) => Boolean(current?.user)),
    session.then((current) => (current?.user ? heldBottlesByBeerOrNone() : undefined)),
    getTranslation(locale),
  ]);
  if (result.content.length === 0 && result.totalElements > 0) {
    redirect(catalogHref(locale, { ...beerParams, page: String(result.totalPages - 1) }));
  }
  const isSignedIn = signedIn;

  return (
    <Page width="wide">
      <PageTitle>
        {t("catalog.title")}
      </PageTitle>
      <div className={catalogColumns}>
        <div className="md:sticky md:top-20">
          <SearchFilters locale={locale} params={beerParams} countryCodes={countryCodes} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <ResultSummary locale={locale} params={beerParams} totalElements={result.totalElements} />
          <BeerList
            locale={locale}
            beers={result.content}
            search={beerParams}
            heldBottles={heldBottles}
            emptyAction={
              <AddBeerEntry locale={locale} query={beerParams.query} isSignedIn={isSignedIn} placement="empty" />
            }
            renderActions={(beer) => (
              <AddToCellarButton
                locale={locale}
                beerId={beer.id}
                beerName={beer.name}
                isSignedIn={isSignedIn}
                compact
              />
            )}
          />
          {result.content.length > 0 && hasFilters(beerParams) && (
            <AddBeerEntry locale={locale} query={beerParams.query} isSignedIn={isSignedIn} placement="line" />
          )}
          <Pagination locale={locale} params={beerParams} result={result} />
        </div>
      </div>
      <JustAddedToast />
    </Page>
  );
};

export default BeersPage;

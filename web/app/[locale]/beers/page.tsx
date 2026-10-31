import type { Metadata } from "next";
import { auth } from "@/auth";
import { isApiError } from "@kalia/api";
import {
  AddBeerEntry,
  BeerList,
  catalogColumns,
  hasFilters,
  IgnoredFilterNote,
  isPastLastPage,
  normalizeBeerSearchParams,
  JustAddedToast,
  Pagination,
  parseBeerSearchParams,
  PastLastPage,
  type BeerSearchParams,
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

// Only the country can be refused for a value the page cannot check: the other
// bounds are checked in normalizeBeerSearchParams, the country list lives in the API.
const searchOrDropRefusedCountry = async (params: BeerSearchParams) => {
  try {
    return { result: await searchBeers(params), params, refusedCountry: false };
  } catch (error) {
    if (!params.countryCode || !isApiError(error) || error.status !== 400) {
      throw error;
    }
    const withoutCountry = { ...params, countryCode: undefined };
    return { result: await searchBeers(withoutCountry), params: withoutCountry, refusedCountry: true };
  }
};

const BeersPage = async ({ params, searchParams }: Props) => {
  const locale = toLocale((await params).locale);
  const normalized = normalizeBeerSearchParams(parseBeerSearchParams(await searchParams));
  const session = auth();
  const [{ result, params: beerParams, refusedCountry }, countryCodes, signedIn, heldBottles, { t }] = await Promise.all([
    searchOrDropRefusedCountry(normalized.params),
    listBreweryCountries(),
    session.then((current) => Boolean(current?.user)),
    session.then((current) => (current?.user ? heldBottlesByBeerOrNone() : undefined)),
    getTranslation(locale),
  ]);
  const isSignedIn = signedIn;
  const ignored = refusedCountry ? [...normalized.ignored, "countryCode"] : normalized.ignored;

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
          {ignored.length > 0 && <IgnoredFilterNote locale={locale} />}
          <ResultSummary locale={locale} params={beerParams} totalElements={result.totalElements} />
          {isPastLastPage(result) ? (
            <PastLastPage locale={locale} params={beerParams} result={result} />
          ) : (
            <BeerList
              locale={locale}
              beers={result.content}
              search={beerParams}
              heldBottles={heldBottles}
              emptyAction={
                <AddBeerEntry locale={locale} search={beerParams} isSignedIn={isSignedIn} placement="empty" />
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
          )}
          {result.content.length > 0 && hasFilters(beerParams) && (
            <AddBeerEntry locale={locale} search={beerParams} isSignedIn={isSignedIn} placement="line" />
          )}
          <Pagination locale={locale} params={beerParams} result={result} />
        </div>
      </div>
      <JustAddedToast />
    </Page>
  );
};

export default BeersPage;

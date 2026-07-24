import type { Metadata } from "next";
import { searchBeers } from "@/features/catalog/api";
import { BeerList } from "@/features/catalog/BeerList";
import { Pagination } from "@/features/catalog/Pagination";
import { SearchFilters } from "@/features/catalog/SearchFilters";
import type { BeerSearchParams } from "@/features/catalog/types";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";

type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined => {
  return Array.isArray(value) ? value[0] : value;
};

const toBeerSearchParams = (raw: RawSearchParams): BeerSearchParams => {
  return {
    query: first(raw.query),
    style: first(raw.style),
    country: first(raw.country),
    minAbv: first(raw.minAbv),
    maxAbv: first(raw.maxAbv),
    page: first(raw.page),
    size: first(raw.size),
    sort: first(raw.sort),
  };
};

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
  const beerParams = toBeerSearchParams(await searchParams);
  const result = await searchBeers(beerParams);
  const { t } = await getTranslation(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        {t("catalog.title")}
      </h1>
      <SearchFilters locale={locale} params={beerParams} />
      <BeerList locale={locale} beers={result.content} />
      <Pagination locale={locale} params={beerParams} result={result} />
    </main>
  );
};

export default BeersPage;

import type { Metadata } from "next";
import { searchBeers } from "@/features/catalog/api";
import { BeerList } from "@/features/catalog/BeerList";
import { Pagination } from "@/features/catalog/Pagination";
import { SearchFilters } from "@/features/catalog/SearchFilters";
import type { BeerSearchParams } from "@/features/catalog/types";

export const metadata: Metadata = {
  title: "Beer catalog — Kalia",
};

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

const BeersPage = async ({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) => {
  const params = toBeerSearchParams(await searchParams);
  const result = await searchBeers(params);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <h1 className="text-3xl font-bold tracking-tight">Beer catalog</h1>
      <SearchFilters params={params} />
      <BeerList beers={result.content} />
      <Pagination params={params} result={result} />
    </main>
  );
};

export default BeersPage;

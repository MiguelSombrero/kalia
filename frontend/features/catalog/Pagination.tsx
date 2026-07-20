import Link from "next/link";
import { buildBeerSearchParams } from "./api";
import type { BeerPage, BeerSearchParams } from "./types";

function pageHref(params: BeerSearchParams, page: number): string {
  const searchParams = buildBeerSearchParams({ ...params, page: String(page) });
  return `/beers?${searchParams.toString()}`;
}

export function Pagination({ params, result }: { params: BeerSearchParams; result: BeerPage }) {
  if (result.totalPages <= 1) {
    return null;
  }

  const linkClasses =
    "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        Page {result.page + 1} of {result.totalPages} ({result.totalElements} beers)
      </span>
      <div className="flex gap-2">
        {result.page > 0 && (
          <Link href={pageHref(params, result.page - 1)} className={linkClasses}>
            ← Previous
          </Link>
        )}
        {result.page < result.totalPages - 1 && (
          <Link href={pageHref(params, result.page + 1)} className={linkClasses}>
            Next →
          </Link>
        )}
      </div>
    </nav>
  );
}

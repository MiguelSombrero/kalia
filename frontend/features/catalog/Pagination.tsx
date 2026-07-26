import { buttonVariants } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { buildBeerSearchParams } from "./api";
import type { BeerPage, BeerSearchParams } from "./types";

const pageHref = (locale: Locale, params: BeerSearchParams, page: number): string => {
  const searchParams = buildBeerSearchParams({ ...params, page: String(page) });
  return `/${locale}/beers?${searchParams.toString()}`;
};

/**
 * These are plain anchors, not `next/link` — do not "upgrade" them.
 *
 * With `<Link>`, clicking Previous/Next did nothing at all: the URL never
 * changed and the list never moved (iteration 3 task 11). Client-side
 * navigation that changes only the query string did not commit on this
 * route, while pathname changes (a beer card, the locale switcher) worked
 * fine. The router fetched the correct RSC payload and then discarded the
 * transition. Only production builds were affected, because automatic
 * prefetching does not run in `next dev`.
 *
 * `prefetch={false}` was measured as an unreliable remedy — the first click
 * still failed — so this does not depend on prefetch behaviour at all. A
 * full page load is also what `SearchFilters` already does: it is a native
 * GET form, which is precisely why filtering and sorting never showed this
 * symptom. Pagination is the same interaction — put query params in the URL,
 * re-render the list — so it now works the same way.
 */

export const Pagination = async ({
  locale,
  params,
  result,
}: {
  locale: Locale;
  params: BeerSearchParams;
  result: BeerPage;
}) => {
  if (result.totalPages <= 1) {
    return null;
  }

  const { t } = await getTranslation(locale);
  const linkClasses = buttonVariants("outline");

  return (
    <nav aria-label={t("catalog.pagination.label")} className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        {t("catalog.pagination.summary", {
          page: result.page + 1,
          totalPages: result.totalPages,
          count: result.totalElements,
        })}
      </span>
      <div className="flex gap-2">
        {result.page > 0 && (
          <a href={pageHref(locale, params, result.page - 1)} className={linkClasses}>
            {t("catalog.pagination.previous")}
          </a>
        )}
        {result.page < result.totalPages - 1 && (
          <a href={pageHref(locale, params, result.page + 1)} className={linkClasses}>
            {t("catalog.pagination.next")}
          </a>
        )}
      </div>
    </nav>
  );
};

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { buildBeerSearchParams } from "./api";
import type { BeerPage, BeerSearchParams } from "./types";

const pageHref = (locale: Locale, params: BeerSearchParams, page: number): string => {
  const searchParams = buildBeerSearchParams({ ...params, page: String(page) });
  return `/${locale}/beers?${searchParams.toString()}`;
};

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
          <Link href={pageHref(locale, params, result.page - 1)} className={linkClasses}>
            {t("catalog.pagination.previous")}
          </Link>
        )}
        {result.page < result.totalPages - 1 && (
          <Link href={pageHref(locale, params, result.page + 1)} className={linkClasses}>
            {t("catalog.pagination.next")}
          </Link>
        )}
      </div>
    </nav>
  );
};

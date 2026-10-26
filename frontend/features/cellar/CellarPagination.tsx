import { buttonVariants } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { cellarHref } from "@/lib/routes";
import { lastPublicCellarPage } from "./publicCellarPages";

/**
 * Plain anchors, not `next/link`: the catalog's pagination records that a
 * client navigation changing only the query string never commits on these
 * routes (see `features/catalog/Pagination.tsx`).
 */
export const CellarPagination = async ({
  locale,
  username,
  page,
  totalPages,
}: {
  locale: Locale;
  username: string;
  page: number;
  totalPages: number;
}) => {
  const reachablePages = Math.min(totalPages, lastPublicCellarPage + 1);
  if (reachablePages <= 1) {
    return null;
  }

  const { t } = await getTranslation(locale);
  const linkClasses = buttonVariants("outline");

  return (
    <nav aria-label={t("cellar.public.pagination.label")} className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">
        {t("cellar.public.pagination.summary", { page: page + 1, totalPages: reachablePages })}
      </span>
      <div className="flex gap-2">
        {page > 0 && (
          <a href={cellarHref(locale, username, page - 1)} className={linkClasses}>
            {t("cellar.public.pagination.previous")}
          </a>
        )}
        {page < reachablePages - 1 && (
          <a href={cellarHref(locale, username, page + 1)} className={linkClasses}>
            {t("cellar.public.pagination.next")}
          </a>
        )}
      </div>
    </nav>
  );
};

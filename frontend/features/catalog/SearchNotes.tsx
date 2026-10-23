import { EmptyState } from "@/components/ui/empty-state";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { catalogHref } from "./links";
import type { BeerPage, BeerSearchParams } from "./types";

export const IgnoredFilterNote = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);
  return <p className="border-l-2 border-border pl-3 text-sm text-muted-foreground">{t("catalog.ignoredFilter")}</p>;
};

export const isPastLastPage = (result: BeerPage): boolean => {
  return result.content.length === 0 && result.totalElements > 0;
};

export const PastLastPage = async ({
  locale,
  params,
  result,
}: {
  locale: Locale;
  params: BeerSearchParams;
  result: BeerPage;
}) => {
  const { t } = await getTranslation(locale);
  return (
    <EmptyState
      title={t("catalog.pastLastPage.title", { page: result.page + 1 })}
      headingLevel={2}
      hint={t("catalog.pastLastPage.hint", { count: result.totalPages })}
      action={
        // Do not swap for next/link: query-only navigation (frontend/README.md traps).
        <a href={catalogHref(locale, { ...params, page: undefined })} className="font-medium underline underline-offset-2">
          {t("catalog.pastLastPage.firstPage")}
        </a>
      }
    />
  );
};

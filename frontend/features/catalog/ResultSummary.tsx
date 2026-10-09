import { Icon } from "@/components/ui/icon";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { formatAbv } from "@/lib/abv";
import { catalogHref } from "./links";
import type { BeerSearchParams } from "./types";

type FilterKey = "query" | "style" | "country" | "minAbv" | "maxAbv";

const FILTER_KEYS: readonly FilterKey[] = ["query", "style", "country", "minAbv", "maxAbv"];

// Do not swap these anchors for next/link: each changes only the query string
// (frontend/README.md traps).
export const ResultSummary = async ({
  locale,
  params,
  totalElements,
}: {
  locale: Locale;
  params: BeerSearchParams;
  totalElements: number;
}) => {
  const { t } = await getTranslation(locale);

  const label = (key: FilterKey, value: string): string => {
    switch (key) {
      case "query":
        return t("catalog.filters.queryChip", { query: value });
      case "minAbv":
        return t("catalog.filters.atLeast", { abv: formatAbv(value, locale) });
      case "maxAbv":
        return t("catalog.filters.atMost", { abv: formatAbv(value, locale) });
      default:
        return value;
    }
  };

  const active = FILTER_KEYS.flatMap((key) => {
    const value = params[key];
    return value ? [{ key, text: label(key, value) }] : [];
  });

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      <p className="font-semibold text-foreground">
        {t("catalog.resultCount", { count: totalElements })}
      </p>
      {active.map(({ key, text }) => (
        <a
          key={key}
          href={catalogHref(locale, { ...params, [key]: undefined, page: undefined })}
          aria-label={t("catalog.filters.removeFilter", { filter: text })}
          className="inline-flex min-h-7 items-center gap-1.5 rounded-control border border-border py-0.5 pr-1 pl-2 text-sm text-foreground hover:border-primary hover:text-primary"
        >
          {text}
          <Icon name="close" className="size-4" />
        </a>
      ))}
      {active.length > 0 && (
        <a href={catalogHref(locale)} className="inline-block py-1 text-sm underline underline-offset-2 md:hidden">
          {t("catalog.filters.clearAll")}
        </a>
      )}
    </div>
  );
};

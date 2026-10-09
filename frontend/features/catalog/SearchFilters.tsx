import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { catalogHref, hasFilters } from "./links";
import { DEFAULT_SORT, SORT_OPTIONS, type BeerSearchParams } from "./types";

const labelClasses = "mb-1 block text-label font-semibold uppercase text-foreground";
const inputClasses =
  "min-h-10 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-foreground";

const foldedFilterCount = (params: BeerSearchParams): number => {
  const set = [params.style, params.country, params.minAbv, params.maxAbv].filter(Boolean).length;
  const sorted = params.sort && params.sort !== DEFAULT_SORT ? 1 : 0;
  return set + sorted;
};

// Plain GET form, deliberately native rather than react-hook-form/Zod
// (ADR-0010); submitting drops the page param, restarting from page one.
export const SearchFilters = async ({
  locale,
  params,
}: {
  locale: Locale;
  params: BeerSearchParams;
}) => {
  const { t } = await getTranslation(locale);
  const folded = foldedFilterCount(params);

  return (
    <form role="search" action={`/${locale}/beers`} method="get" className="flex flex-col gap-4">
      <div>
        <label htmlFor="query" className={labelClasses}>
          {t("catalog.filters.searchLabel")}
        </label>
        <input
          id="query"
          name="query"
          type="search"
          placeholder={t("catalog.filters.searchPlaceholder")}
          defaultValue={params.query ?? ""}
          className={inputClasses}
        />
      </div>
      {/* ADR-0069: from md, CSS shows the fold open where ::details-content is
          supported; elsewhere the summary stays, so the fields are still reachable. */}
      <details className="group border-y border-border md:supports-[selector(::details-content)]:border-0 md:details-content:block md:details-content:[content-visibility:visible]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-label font-semibold uppercase text-foreground md:supports-[selector(::details-content)]:hidden [&::-webkit-details-marker]:hidden">
          <span>
            {t("catalog.filters.toggle")}
            {folded > 0 && ` · ${folded}`}
          </span>
          <Icon name="plus" className="size-5 transition-transform group-open:rotate-45" />
        </summary>
        <div className="flex flex-col gap-4 pb-4 md:pb-0">
          <div>
            <label htmlFor="style" className={labelClasses}>
              {t("catalog.filters.styleLabel")}
            </label>
            <input
              id="style"
              name="style"
              type="text"
              placeholder={t("catalog.filters.stylePlaceholder")}
              defaultValue={params.style ?? ""}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="country" className={labelClasses}>
              {t("catalog.filters.countryLabel")}
            </label>
            <input
              id="country"
              name="country"
              type="text"
              placeholder={t("catalog.filters.countryPlaceholder")}
              defaultValue={params.country ?? ""}
              className={inputClasses}
            />
          </div>
          <fieldset>
            <legend className={labelClasses}>{t("catalog.filters.strengthLabel")}</legend>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="minAbv" className="mb-0.5 block text-sm text-muted-foreground">
                  <span aria-hidden="true">{t("catalog.filters.minShort")}</span>
                  <span className="sr-only">{t("catalog.filters.minAbvLabel")}</span>
                </label>
                <input
                  id="minAbv"
                  name="minAbv"
                  type="number"
                  min="0"
                  step="0.1"
                  defaultValue={params.minAbv ?? ""}
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="maxAbv" className="mb-0.5 block text-sm text-muted-foreground">
                  <span aria-hidden="true">{t("catalog.filters.maxShort")}</span>
                  <span className="sr-only">{t("catalog.filters.maxAbvLabel")}</span>
                </label>
                <input
                  id="maxAbv"
                  name="maxAbv"
                  type="number"
                  min="0"
                  step="0.1"
                  defaultValue={params.maxAbv ?? ""}
                  className={inputClasses}
                />
              </div>
            </div>
          </fieldset>
          <div>
            <label htmlFor="sort" className={labelClasses}>
              {t("catalog.filters.sortLabel")}
            </label>
            <select id="sort" name="sort" defaultValue={params.sort ?? DEFAULT_SORT} className={inputClasses}>
              {SORT_OPTIONS.map(({ value, labelKey }) => (
                <option key={value} value={value}>
                  {t(labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>
      <Button type="submit" className="w-full">
        {t("catalog.filters.submit")}
      </Button>
      {hasFilters(params) && (
        // Do not swap for next/link: query-only navigation (frontend/README.md traps).
        <a
          href={catalogHref(locale)}
          className="hidden self-start py-1 text-sm underline underline-offset-2 md:inline-block"
        >
          {t("catalog.filters.clearAll")}
        </a>
      )}
    </form>
  );
};

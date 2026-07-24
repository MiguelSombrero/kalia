import { buttonVariants } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import type { BeerSearchParams } from "./types";

const inputClasses =
  "w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground";

/**
 * Plain GET form: submitting writes the filters into the URL, which keeps
 * results shareable and works without client-side JavaScript. Submitting
 * also drops the page param, restarting from the first page. Stays native
 * per ADR-0010 — nothing here needs react-hook-form/Zod.
 */
export const SearchFilters = async ({
  locale,
  params,
}: {
  locale: Locale;
  params: BeerSearchParams;
}) => {
  const { t } = await getTranslation(locale);

  return (
    <form
      role="search"
      action={`/${locale}/beers`}
      method="get"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
    >
      <div className="lg:col-span-2">
        <label htmlFor="query" className="mb-1 block text-sm font-medium">
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
      <div>
        <label htmlFor="style" className="mb-1 block text-sm font-medium">
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
        <label htmlFor="country" className="mb-1 block text-sm font-medium">
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
      <div>
        <label htmlFor="minAbv" className="mb-1 block text-sm font-medium">
          {t("catalog.filters.minAbvLabel")}
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
        <label htmlFor="maxAbv" className="mb-1 block text-sm font-medium">
          {t("catalog.filters.maxAbvLabel")}
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
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
        <div className="grow-0">
          <label htmlFor="sort" className="mb-1 block text-sm font-medium">
            {t("catalog.filters.sortLabel")}
          </label>
          <select id="sort" name="sort" defaultValue={params.sort ?? "name,asc"} className={inputClasses}>
            <option value="name,asc">{t("catalog.filters.sortNameAsc")}</option>
            <option value="name,desc">{t("catalog.filters.sortNameDesc")}</option>
            <option value="abv,asc">{t("catalog.filters.sortAbvAsc")}</option>
            <option value="abv,desc">{t("catalog.filters.sortAbvDesc")}</option>
            <option value="style,asc">{t("catalog.filters.sortStyleAsc")}</option>
          </select>
        </div>
        <button type="submit" className={buttonVariants("primary")}>
          {t("catalog.filters.submit")}
        </button>
      </div>
    </form>
  );
};

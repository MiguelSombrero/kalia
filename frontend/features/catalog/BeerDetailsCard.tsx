import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { formatPrice } from "./formatPrice";
import type { BeerDetails } from "./types";

const breweryLocation = (city: string | undefined, country: string): string => {
  return city ? `${city}, ${country}` : country;
};

export const BeerDetailsCard = async ({
  locale,
  beer,
}: {
  locale: Locale;
  beer: BeerDetails;
}) => {
  const { t } = await getTranslation(locale);

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">{beer.name}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {beer.brewery.name} — {breweryLocation(beer.brewery.city, beer.brewery.country)}
        </p>
      </header>
      <dl className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <dt className="text-sm text-zinc-600 dark:text-zinc-400">{t("beer.style")}</dt>
          <dd className="mt-1 font-medium">{beer.style}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-600 dark:text-zinc-400">{t("beer.abv")}</dt>
          <dd className="mt-1 font-medium">{beer.abv} %</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-600 dark:text-zinc-400">{t("beer.price")}</dt>
          <dd className="mt-1 font-medium">{formatPrice(beer.price, locale)}</dd>
        </div>
      </dl>
      {beer.description && (
        <p className="max-w-prose leading-relaxed text-zinc-700 dark:text-zinc-300">
          {beer.description}
        </p>
      )}
    </article>
  );
};

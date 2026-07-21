import Link from "next/link";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { formatPrice } from "./formatPrice";
import type { BeerSummary } from "./types";

export const BeerList = async ({
  locale,
  beers,
}: {
  locale: Locale;
  beers: BeerSummary[];
}) => {
  const { t } = await getTranslation(locale);

  if (beers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
        <p className="text-lg font-medium">{t("catalog.empty.title")}</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {t("catalog.empty.hintPrefix")}{" "}
          <Link href={`/${locale}/beers`} className="font-medium underline underline-offset-2">
            {t("catalog.empty.clearLink")}
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {beers.map((beer) => (
        <li
          key={beer.id}
          className="relative rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">
              <Link href={`/${locale}/beers/${beer.id}`} className="after:absolute after:inset-0">
                {beer.name}
              </Link>
            </h2>
            <span className="shrink-0 text-sm font-medium">{formatPrice(beer.price, locale)}</span>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{beer.brewery.name}</p>
          <p className="mt-2 text-sm">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
              {beer.style}
            </span>{" "}
            <span className="text-zinc-600 dark:text-zinc-400">{beer.abv} %</span>
          </p>
        </li>
      ))}
    </ul>
  );
};

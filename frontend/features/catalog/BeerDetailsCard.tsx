import { cardVariants } from "@/components/ui/card";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
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
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          {beer.name}
        </h1>
        <p className="text-muted-foreground">
          {beer.brewery.name} — {breweryLocation(beer.brewery.city, beer.brewery.country)}
        </p>
      </header>
      <dl className={cn(cardVariants, "flex flex-wrap gap-x-10 gap-y-4 p-4")}>
        <div>
          <dt className="text-sm text-muted-foreground">{t("beer.style")}</dt>
          <dd className="mt-1 font-medium text-foreground">{beer.style}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("beer.abv")}</dt>
          <dd className="mt-1 font-medium text-foreground">{beer.abv} %</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("beer.price")}</dt>
          <dd className="mt-1 font-medium text-foreground">{formatPrice(beer.price, locale)}</dd>
        </div>
      </dl>
      {beer.description && (
        <p className="max-w-prose leading-relaxed text-foreground">{beer.description}</p>
      )}
    </article>
  );
};

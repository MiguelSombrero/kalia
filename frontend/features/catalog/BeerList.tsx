import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cardVariants } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
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
      <EmptyState title={t("catalog.empty.title")}>
        {t("catalog.empty.hintPrefix")}{" "}
        <Link href={`/${locale}/beers`} className="font-medium underline underline-offset-2">
          {t("catalog.empty.clearLink")}
        </Link>
        .
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {beers.map((beer) => (
        <li
          key={beer.id}
          className={cn(
            cardVariants,
            "relative p-4 transition-colors hover:border-primary focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring",
          )}
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-foreground">
              {/* Stretched link makes the whole card clickable; the ring on
                  the <li> above (focus-within) is what's visible, not this
                  anchor's own small text box. */}
              <Link
                href={`/${locale}/beers/${beer.id}`}
                className="after:absolute after:inset-0 focus-visible:outline-none"
              >
                {beer.name}
              </Link>
            </h2>
            <span className="shrink-0 text-sm font-medium text-foreground">
              {formatPrice(beer.price, locale)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{beer.brewery.name}</p>
          <p className="mt-2 flex flex-wrap gap-1 text-sm">
            <Badge variant="neutral">{beer.style}</Badge>
            <Badge variant="accent">{beer.abv} %</Badge>
          </p>
        </li>
      ))}
    </ul>
  );
};

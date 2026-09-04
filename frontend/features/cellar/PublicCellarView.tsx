import Link from "next/link";
import { cardVariants } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { PublicBeerRow } from "./PublicBeerRow";
import type { PublicCellarBeer } from "./types";

export const PublicCellarView = async ({
  locale,
  beers,
  isOwner,
}: {
  locale: Locale;
  beers: PublicCellarBeer[];
  isOwner: boolean;
}) => {
  const { t } = await getTranslation(locale);

  return (
    <div className="flex flex-col gap-6">
      {isOwner && (
        <p className={cn(cardVariants, "p-4 text-sm text-muted-foreground")}>
          {t("cellar.public.ownerBanner")}{" "}
          <Link
            href={`/${locale}/cellar`}
            className="font-medium text-foreground underline underline-offset-2"
          >
            {t("cellar.public.ownerBannerLink")}
          </Link>
        </p>
      )}

      {beers.length === 0 ? (
        <EmptyState title={t("cellar.public.empty.title")}>
          {t("cellar.public.empty.hint")}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {beers.map((beer) => (
            <li key={beer.entryId}>
              <PublicBeerRow locale={locale} row={beer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

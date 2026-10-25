import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { PersonSlot } from "@/components/ui/person-slot";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { catalogHref, ownCellarHref } from "@/lib/routes";
import { CellarBeerList } from "./CellarBeerList";
import { CellarCounts } from "./CellarCounts";
import { CellarPagination } from "./CellarPagination";
import { cellarHead } from "./layout";
import type { PublicCellar } from "./types";

/** A public cellar: the owner's page without its controls (ADR-0070). */
export const PublicCellarView = async ({
  locale,
  cellar,
  isOwner,
}: {
  locale: Locale;
  cellar: PublicCellar;
  isOwner: boolean;
}) => {
  const { t } = await getTranslation(locale);
  const { username, beers } = cellar;
  // Paged, or a beer cut to its oldest bottles: what the page lists is not the cellar's totals.
  const partial = cellar.totalPages > 1 || beers.some((beer) => beer.unlistedBottles !== undefined);
  const pagination = await CellarPagination({ locale, username, page: cellar.page, totalPages: cellar.totalPages });

  return (
    <>
      {isOwner && (
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-surface border border-border px-4 py-3 text-foreground">
          <span>{t("cellar.public.ownerBanner")}</span>
          <Link href={ownCellarHref(locale)} className="inline-block py-0.5 font-medium underline underline-offset-2">
            {t("cellar.public.ownerBannerLink")}
          </Link>
        </p>
      )}
      <div className="flex items-start gap-4">
        <PersonSlot username={username} size="md" />
        <div className={cellarHead}>
          <PageTitle>{t("cellar.public.heading", { username })}</PageTitle>
          {beers.length > 0 && (
            <CellarCounts
              beers={beers}
              lastAdded={cellar.lastBottleAddedAt}
              wholeCellar={partial ? { beers: cellar.totalBeers, bottles: cellar.totalBottles } : undefined}
              locale={locale}
            />
          )}
        </div>
      </div>
      {beers.length > 0 ? (
        <CellarBeerList locale={locale} beers={beers} owner={false} sortable={cellar.totalPages <= 1} />
      ) : (
        <EmptyState title={t("cellar.public.empty.title")} headingLevel={2} hint={t("cellar.public.empty.hint")} />
      )}
      {pagination}
      {!isOwner && (
        <section className="flex flex-col gap-3 border-t border-border pt-5">
          <p className="font-semibold text-foreground">{t("cellar.public.about")}</p>
          <div className="flex flex-wrap gap-2">
            <Link href={catalogHref(locale)} className={buttonVariants("outline")}>
              {t("cellar.public.browse")}
            </Link>
            <Link href={`/${locale}/sign-up`} className={buttonVariants("outline")}>
              {t("auth.signUp")}
            </Link>
          </div>
        </section>
      )}
    </>
  );
};

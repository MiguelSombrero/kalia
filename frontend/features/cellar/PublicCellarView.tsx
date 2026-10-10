import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PersonSlot } from "@/components/ui/person-slot";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { CellarBeerList } from "./CellarBeerList";
import { CellarCounts } from "./CellarCounts";
import { cellarHead, cellarTitle } from "./layout";
import type { CellarBeer } from "./types";

/**
 * A public cellar: the owner's page without its controls (ADR-0070). A stranger
 * also gets a word on what Kalia is, since this is the page shared outwards.
 */
export const PublicCellarView = async ({
  locale,
  username,
  beers,
  isOwner,
}: {
  locale: Locale;
  username: string;
  beers: CellarBeer[];
  isOwner: boolean;
}) => {
  const { t } = await getTranslation(locale);
  const lastAdded = beers
    .flatMap((beer) => beer.bottles.map((bottle) => bottle.createdAt))
    .sort()
    .at(-1);

  return (
    <>
      {isOwner && (
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-surface border border-border px-4 py-3 text-foreground">
          <span>{t("cellar.public.ownerBanner")}</span>
          <Link href={`/${locale}/cellar`} className="inline-block py-0.5 font-medium underline underline-offset-2">
            {t("cellar.public.ownerBannerLink")}
          </Link>
        </p>
      )}
      <div className="flex items-start gap-4">
        <PersonSlot username={username} size="md" />
        <div className={cellarHead}>
          <h1 className={cellarTitle}>{t("cellar.public.heading", { username })}</h1>
          {beers.length > 0 && <CellarCounts beers={beers} lastAdded={lastAdded} locale={locale} />}
        </div>
      </div>
      {beers.length > 0 ? (
        <CellarBeerList locale={locale} beers={beers} owner={false} />
      ) : (
        <section className="flex flex-col gap-2 border-t border-border pt-6">
          <h2 className="text-2xl font-bold text-foreground">{t("cellar.public.empty.title")}</h2>
          <p className="text-muted-foreground">{t("cellar.public.empty.hint")}</p>
        </section>
      )}
      {!isOwner && (
        <section className="flex flex-col gap-3 border-t border-border pt-5">
          <p className="font-semibold text-foreground">{t("cellar.public.about")}</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${locale}/beers`} className={buttonVariants("outline")}>
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

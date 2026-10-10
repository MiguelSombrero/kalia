import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { CellarBeerList } from "./CellarBeerList";
import { CellarCounts } from "./CellarCounts";
import { cellarHead, cellarTitle } from "./layout";
import type { CellarBeer } from "./types";

const EMPTY_STEPS = ["cellar.empty.step1", "cellar.empty.step2", "cellar.empty.step3"] as const;

export const CellarView = async ({
  locale,
  beers,
  visibility,
}: {
  locale: Locale;
  beers: CellarBeer[];
  /** Null when the profile could not be read: the visibility line is left out. */
  visibility: { username: string; cellarPublic: boolean } | null;
}) => {
  const { t } = await getTranslation(locale);

  return (
    <>
      <div className={cellarHead}>
        <h1 className={cellarTitle}>{t("cellar.title")}</h1>
        {beers.length > 0 && <CellarCounts beers={beers} locale={locale} />}
        {visibility && (
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-muted-foreground">
            <span className="font-semibold text-foreground">
              {visibility.cellarPublic ? t("cellar.visibility.public") : t("cellar.visibility.private")}
            </span>
            <span>{visibility.cellarPublic ? t("cellar.visibility.publicLine") : t("cellar.visibility.privateLine")}</span>
            <Link
              href={visibility.cellarPublic ? `/cellars/${visibility.username}` : `/${locale}/profile`}
              className="inline-block py-0.5 text-foreground underline underline-offset-2"
            >
              {visibility.cellarPublic ? t("cellar.visibility.view") : t("cellar.visibility.change")}
            </Link>
          </p>
        )}
      </div>
      {beers.length > 0 ? (
        <CellarBeerList locale={locale} beers={beers} owner />
      ) : (
        <section className="flex flex-col items-start gap-4 border-t border-border pt-6">
          <h2 className="text-2xl font-bold text-foreground">{t("cellar.empty.title")}</h2>
          <p className="max-w-prose text-muted-foreground">{t("cellar.empty.hint")}</p>
          <ol className="w-full max-w-xl border-t border-divider">
            {EMPTY_STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-3.5 border-b border-divider py-2.5 text-foreground">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-control border border-border font-bold tabular-nums"
                >
                  {index + 1}
                </span>
                {t(step)}
              </li>
            ))}
          </ol>
          <Link href={`/${locale}/beers`} className={buttonVariants("primary")}>
            {t("cellar.empty.action")}
          </Link>
        </section>
      )}
    </>
  );
};

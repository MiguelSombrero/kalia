"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";

type Props = {
  locale: Locale;
  counts: { bottles: number; beers: number } | null;
  cellarPublic: boolean;
};

const figure = "font-display text-3xl/none font-extrabold tabular-nums text-foreground md:text-5xl/none";
const figureLabel = "mt-1 text-label font-semibold uppercase text-muted-foreground";

export const CellarSummary = ({ locale, counts, cellarPublic }: Props) => {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="cellar-summary-heading" className="flex flex-col gap-3.5">
      <h2 id="cellar-summary-heading" className="text-label font-semibold uppercase text-foreground">
        {t("cellar.title")}
      </h2>
      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start md:gap-10">
        {counts && (
          <div className="grid grid-cols-2 border-y border-border">
            <p className="flex flex-col py-2.5">
              <span className={figure}>{counts.bottles}</span>
              <span className={figureLabel}>{t("home.cellar.bottles", { count: counts.bottles })}</span>
            </p>
            <p className="flex flex-col border-l border-divider py-2.5 pl-3">
              <span className={figure}>{counts.beers}</span>
              <span className={figureLabel}>{t("home.cellar.beers", { count: counts.beers })}</span>
            </p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {cellarPublic ? (
              t("profile.visibility.statePublic")
            ) : (
              <>
                {t("feed.empty.privateHint")}{" "}
                <Link href={`/${locale}/profile`} className="text-foreground underline underline-offset-2">
                  {t("feed.empty.privateLink")}
                </Link>
              </>
            )}
          </p>
          <Link href={`/${locale}/cellar`} className={cn(buttonVariants("primary"), "self-start")}>
            {t("home.cellar.open")}
          </Link>
        </div>
      </div>
    </section>
  );
};

"use client";

import { useTranslation } from "react-i18next";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { bottleDateParts, containerLabelKey } from "./bottleFacts";
import type { PublicBottle } from "./types";

/**
 * The bottles of one beer in a public cellar: the same dates-and-container
 * line the owner's BottleList shows, without the edit and remove controls.
 */
export const PublicBottleList = ({
  locale,
  beerName,
  bottles,
}: {
  locale: Locale;
  beerName: string;
  bottles: PublicBottle[];
}) => {
  const { t } = useTranslation();

  return (
    <ul aria-label={t("cellar.bottle.list", { beer: beerName })} className="flex flex-col gap-2">
      {bottles.map((bottle) => {
        const dateParts = bottleDateParts(bottle, locale).map((part) =>
          t(part.key, { relative: part.relative }),
        );

        return (
          <li key={bottle.id} className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            {dateParts.length > 0 && <span>{dateParts.join(" · ")}</span>}
            <span
              className={cn("shrink-0 text-muted-foreground", dateParts.length > 0 && "ml-auto")}
            >
              {t(containerLabelKey[bottle.containerType])}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

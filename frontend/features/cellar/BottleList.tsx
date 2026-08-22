"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { formatRelativeDate } from "./formatRelativeDate";
import type { Bottle, ContainerType } from "./types";

const containerLabelKey: Record<ContainerType, string> = {
  BOTTLE: "cellar.bottle.container.BOTTLE",
  CAN: "cellar.bottle.container.CAN",
  KEG: "cellar.bottle.container.KEG",
};

export const BottleList = ({ locale, query }: { locale: Locale; query: UseQueryResult<Bottle[]> }) => {
  const { t } = useTranslation();

  if (query.isPending) {
    return (
      <div role="status" aria-label={t("cellar.bottle.loading")} className="flex flex-col gap-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-40" />
      </div>
    );
  }

  if (query.isError) {
    return <p className="text-sm text-muted-foreground">{t("cellar.bottle.error")}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {query.data.map((bottle) => {
        const dateParts = [
          bottle.brewedDate &&
            t("cellar.bottle.brewed", { relative: formatRelativeDate(bottle.brewedDate, locale) }),
          bottle.bestBeforeDate &&
            t("cellar.bottle.bestBefore", { relative: formatRelativeDate(bottle.bestBeforeDate, locale) }),
        ].filter((part): part is string => Boolean(part));

        return (
          <li key={bottle.id} className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            {dateParts.length > 0 && <span>{dateParts.join(" · ")}</span>}
            <span className={cn("shrink-0 text-muted-foreground", dateParts.length > 0 && "ml-auto")}>
              {t(containerLabelKey[bottle.containerType])}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

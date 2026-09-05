"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { bottleDateParts, containerLabelKey } from "./bottleFacts";
import { EditBottleDialog } from "./EditBottleDialog";
import { RemoveBottleDialog } from "./RemoveBottleDialog";
import { isBottleHidden, useBottleRemovalStore } from "./store";
import type { Bottle } from "./types";

export const BottleList = ({
  locale,
  entryId,
  beerName,
  query,
}: {
  locale: Locale;
  entryId: string;
  beerName: string;
  query: UseQueryResult<Bottle[]>;
}) => {
  const { t } = useTranslation();
  const removing = useBottleRemovalStore((state) => state.removing);

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

  const visibleBottles = query.data.filter((bottle) => !isBottleHidden(removing, bottle.id));

  return (
    <ul aria-label={t("cellar.bottle.list", { beer: beerName })} className="flex flex-col gap-2">
      {visibleBottles.map((bottle) => {
        const dateParts = bottleDateParts(bottle, locale).map((part) =>
          t(part.key, { relative: part.relative }),
        );

        return (
          <li key={bottle.id} className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            {dateParts.length > 0 && <span>{dateParts.join(" · ")}</span>}
            <span className={cn("shrink-0 text-muted-foreground", dateParts.length > 0 && "ml-auto")}>
              {t(containerLabelKey[bottle.containerType])}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <EditBottleDialog bottle={bottle} beerName={beerName} />
              <RemoveBottleDialog
                bottle={bottle}
                entryId={entryId}
                beerName={beerName}
                lastBottle={visibleBottles.length === 1}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
};

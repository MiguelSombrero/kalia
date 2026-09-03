"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { EditBottleDialog } from "./EditBottleDialog";
import { formatRelativeDate } from "./formatRelativeDate";
import { useRemoveBottle } from "./hooks/useBottles";
import { isBottleHidden, useBottleRemovalStore } from "./store";
import type { Bottle, ContainerType } from "./types";

const containerLabelKey: Record<ContainerType, string> = {
  BOTTLE: "cellar.bottle.container.BOTTLE",
  CAN: "cellar.bottle.container.CAN",
  KEG: "cellar.bottle.container.KEG",
};

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
  const removeBottle = useRemoveBottle();
  const startRemoval = useBottleRemovalStore((state) => state.startRemoval);
  const pending = useBottleRemovalStore((state) => state.pending);
  const finalizing = useBottleRemovalStore((state) => state.finalizing);

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

  const visibleBottles = query.data.filter(
    (bottle) => !isBottleHidden({ pending, finalizing }, bottle.id),
  );

  return (
    <ul aria-label={t("cellar.bottle.list", { beer: beerName })} className="flex flex-col gap-2">
      {visibleBottles.map((bottle) => {
        const dateParts = [
          bottle.brewedDate &&
            t("cellar.bottle.brewed", { relative: formatRelativeDate(bottle.brewedDate, locale) }),
          bottle.bestBeforeDate &&
            t("cellar.bottle.bestBefore", {
              relative: formatRelativeDate(bottle.bestBeforeDate, locale),
            }),
        ].filter((part): part is string => Boolean(part));

        return (
          <li key={bottle.id} className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            {dateParts.length > 0 && <span>{dateParts.join(" · ")}</span>}
            <span className={cn("shrink-0 text-muted-foreground", dateParts.length > 0 && "ml-auto")}>
              {t(containerLabelKey[bottle.containerType])}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <EditBottleDialog bottle={bottle} beerName={beerName} />
              <button
                type="button"
                className={cn(buttonVariants("outline"), "gap-1.5")}
                onClick={() =>
                  startRemoval(
                    { bottleId: bottle.id, entryId, lastBottle: visibleBottles.length === 1 },
                    () => removeBottle.mutateAsync({ id: bottle.id, entryId }),
                  )
                }
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4"
                >
                  <path
                    d="M4 6h12M8 6V4h4v2m-7 0 .8 10.2A1 1 0 0 0 6.8 17h6.4a1 1 0 0 0 1-.8L15 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t("cellar.bottle.remove.action")}
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
};

"use client";

import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/settings";
import { containerLabelKey } from "./bottleFacts";
import { formatBottleDate, isPastBestBefore, relativeToLocalDay, vintageOf } from "./bottleTime";
import { EditBottleDialog } from "./EditBottleDialog";
import { useLocalToday } from "./hooks/useLocalToday";
import { RemoveBottleDialog } from "./RemoveBottleDialog";
import type { Bottle } from "./types";

const tileAction =
  "inline-flex min-h-10 flex-1 basis-0 items-center justify-center gap-1.5 whitespace-nowrap bg-surface px-2 text-label font-semibold uppercase text-foreground hover:bg-surface-sunken hover:text-primary";

export const BottleTile = ({
  locale,
  bottle,
  number,
  beerName,
  owner,
  lastBottle = false,
}: {
  locale: Locale;
  bottle: Bottle;
  /** The bottle's place among its beer's bottles, counting from 1. */
  number: number;
  beerName: string;
  owner: boolean;
  lastBottle?: boolean;
}) => {
  const { t } = useTranslation();
  const today = useLocalToday();
  const name = t("cellar.bottle.number", { container: t(containerLabelKey[bottle.containerType]), number });
  const vintage = vintageOf(bottle);
  const past = today !== null && isPastBestBefore(bottle, today);

  return (
    <li className="flex min-w-0 flex-col rounded-surface border border-border bg-surface">
      <div className="flex min-h-9 items-center justify-between gap-2 border-b border-divider px-2.5 py-2">
        <span className="text-sm font-bold text-foreground">{name}</span>
        {vintage ? (
          <span className="font-display text-lg/none font-extrabold tabular-nums text-foreground">
            <span className="sr-only">{t("cellar.bottle.vintage")} </span>
            {vintage}
          </span>
        ) : (
          <span className="font-display text-lg/none font-extrabold text-muted-foreground">
            <span aria-hidden="true">—</span>
            <span className="sr-only">{t("cellar.bottle.vintageUnknown")}</span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        {bottle.brewedDate && (
          <p className="flex flex-col text-sm tabular-nums text-foreground">
            <span className="text-label font-semibold uppercase text-muted-foreground">
              {t("cellar.bottle.brewedLabel")}
            </span>
            <span className="font-semibold">{formatBottleDate(bottle.brewedDate, locale)}</span>
            {today && (
              <span className="text-xs text-muted-foreground">
                {relativeToLocalDay(bottle.brewedDate, today, locale)}
              </span>
            )}
          </p>
        )}
        {bottle.bestBeforeDate ? (
          <p className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-divider pt-2 text-xs tabular-nums text-muted-foreground">
            <span>{t("cellar.bottle.bestBeforeOn", { date: formatBottleDate(bottle.bestBeforeDate, locale) })}</span>
            {past && <Badge variant="ink">{t("cellar.bottle.pastBestBefore")}</Badge>}
          </p>
        ) : (
          !bottle.brewedDate && <p className="text-xs text-muted-foreground">{t("cellar.bottle.noDates")}</p>
        )}
      </div>
      {owner && (
        // gap-px over a divider-coloured ground draws the rule between the two
        // buttons whether they sit side by side or wrap onto two rows.
        <div className="flex flex-wrap gap-px border-t border-divider bg-divider">
          <EditBottleDialog
            bottle={bottle}
            beerName={beerName}
            triggerClassName={tileAction}
            triggerLabel={t("cellar.bottle.editFor", { bottle: name, beer: beerName })}
          />
          <RemoveBottleDialog
            bottle={bottle}
            entryId={bottle.entryId}
            beerName={beerName}
            lastBottle={lastBottle}
            triggerClassName={tileAction}
            triggerLabel={t("cellar.bottle.removeFor", { bottle: name, beer: beerName })}
          />
        </div>
      )}
    </li>
  );
};

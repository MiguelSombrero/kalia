"use client";

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cardVariants } from "@/components/ui/card";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { BottleList } from "./BottleList";
import { hiddenBottleCountForEntry, useBottleRemovalStore } from "./store";
import type { CellarBeerRow } from "./types";
import { useCellarBottles } from "./hooks/useBottles";

export const BeerRow = ({ locale, row }: { locale: Locale; row: CellarBeerRow }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId();

  const bottlesQuery = useCellarBottles(row.entryId, { enabled: isExpanded });
  const pending = useBottleRemovalStore((state) => state.pending);
  const finalizing = useBottleRemovalStore((state) => state.finalizing);

  // Optimistic overlay for the undo window and any in-flight delayed
  // DELETE: hides the whole row the moment it would reach zero bottles,
  // and keeps it hidden until that DELETE actually settles.
  const bottleCount = row.bottleCount - hiddenBottleCountForEntry({ pending, finalizing }, row.entryId);
  if (bottleCount <= 0) {
    return null;
  }

  return (
    <div className={cn(cardVariants, "overflow-hidden")}>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={() => setIsExpanded((current) => !current)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-primary/5 focus-visible:outline-none"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            isExpanded && "rotate-90",
          )}
        >
          <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">{row.beerName}</span>
          <span className="block text-sm text-muted-foreground">{row.breweryName}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <Badge variant="neutral">{row.style}</Badge>
          <Badge variant="accent">{row.abv} %</Badge>
        </span>
        <span className="w-16 shrink-0 text-right text-sm font-semibold text-foreground">
          {t("cellar.entry.bottleCount", { count: bottleCount })}
        </span>
      </button>
      <div id={panelId} hidden={!isExpanded} className="border-t border-border px-4 py-3 pl-11">
        {isExpanded && (
          <BottleList
            locale={locale}
            entryId={row.entryId}
            beerName={row.beerName}
            query={bottlesQuery}
          />
        )}
      </div>
    </div>
  );
};

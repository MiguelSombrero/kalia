"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Locale } from "@/i18n/settings";
import { BottleList } from "./BottleList";
import { CellarBeerAccordion } from "./CellarBeerAccordion";
import { hiddenBottleCountForEntry, useBottleRemovalStore } from "./store";
import type { CellarBeerRow } from "./types";
import { useCellarBottles } from "./hooks/useBottles";

export const BeerRow = ({ locale, row }: { locale: Locale; row: CellarBeerRow }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const bottlesQuery = useCellarBottles(row.entryId, { enabled: isExpanded });
  const removing = useBottleRemovalStore((state) => state.removing);

  // Optimistic overlay for an in-flight DELETE: hides the whole row the
  // moment it would reach zero bottles, and keeps it hidden until that
  // DELETE actually settles.
  const bottleCount = row.bottleCount - hiddenBottleCountForEntry(removing, row.entryId);
  if (bottleCount <= 0) {
    return null;
  }

  return (
    <CellarBeerAccordion
      expanded={isExpanded}
      onToggle={() => setIsExpanded((current) => !current)}
      title={row.beerName}
      subtitle={row.breweryName}
      style={row.style}
      abv={row.abv}
      countLabel={t("cellar.entry.bottleCount", { count: bottleCount })}
    >
      {isExpanded && (
        <BottleList
          locale={locale}
          entryId={row.entryId}
          beerName={row.beerName}
          query={bottlesQuery}
        />
      )}
    </CellarBeerAccordion>
  );
};

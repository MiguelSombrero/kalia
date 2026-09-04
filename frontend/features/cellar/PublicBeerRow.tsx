"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Locale } from "@/i18n/settings";
import { CellarBeerAccordion } from "./CellarBeerAccordion";
import { PublicBottleList } from "./PublicBottleList";
import type { PublicCellarBeer } from "./types";

export const PublicBeerRow = ({ locale, row }: { locale: Locale; row: PublicCellarBeer }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <CellarBeerAccordion
      expanded={isExpanded}
      onToggle={() => setIsExpanded((current) => !current)}
      title={row.beerName}
      subtitle={row.breweryName}
      style={row.style}
      abv={row.abv}
      countLabel={t("cellar.entry.bottleCount", { count: row.bottles.length })}
    >
      {isExpanded && (
        <PublicBottleList locale={locale} beerName={row.beerName} bottles={row.bottles} />
      )}
    </CellarBeerAccordion>
  );
};

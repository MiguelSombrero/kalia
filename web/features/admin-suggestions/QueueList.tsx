"use client";

import { useTranslation } from "react-i18next";
import { BeerSlot } from "@/components/ui/beer-slot";
import { cn } from "@/lib/cn";
import type { SuggestionRow } from "./types";

export const QueueList = ({
  rows,
  selectedId,
  detailOpen,
  onSelect,
}: {
  rows: SuggestionRow[];
  selectedId: string | undefined;
  /** Below the large breakpoint the list stands alone until a suggestion is opened, so nothing is marked as chosen. */
  detailOpen: boolean;
  onSelect: (id: string) => void;
}) => {
  const { t } = useTranslation();

  return (
    <ul aria-label={t("admin.review.queue.label")} className="border border-border">
      {rows.map((row) => (
        <li key={row.id} className="border-t border-divider first:border-t-0">
          <button
            type="button"
            aria-current={row.id === selectedId ? "true" : undefined}
            onClick={() => onSelect(row.id)}
            className={cn(
              "flex w-full items-stretch text-left hover:bg-surface-sunken",
              row.id === selectedId &&
                (detailOpen
                  ? "bg-accent outline outline-1 -outline-offset-1 outline-border"
                  : "lg:bg-accent lg:outline lg:outline-1 lg:-outline-offset-1 lg:outline-border"),
            )}
          >
            <BeerSlot variant="strip" beerStyle={row.style} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2.5">
              <span className="font-semibold [overflow-wrap:anywhere]">{row.name}</span>
              <span className="text-sm text-muted-foreground">
                {row.brewery.name}
                {row.breweryIsNew && ` · ${t("admin.review.queue.newBrewery")}`}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("admin.review.queue.by", { who: row.username ?? t("admin.review.queue.noUsername"), waited: row.waited })}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

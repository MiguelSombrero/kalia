"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { Badge } from "@/components/ui/badge";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type Props = {
  expanded: boolean;
  onToggle: () => void;
  title: string;
  subtitle: string;
  style: string;
  abv: number;
  countLabel: string;
  /** Panel content; the caller guards it with `expanded && …` so a collapsed
   *  row mounts nothing. */
  children: ReactNode;
};

/**
 * The beer-row accordion shared by the owner's cellar and a public cellar: a
 * button carrying the beer's identity and bottle count, expanding a panel
 * below it. Controlled — the parent owns `expanded` because the owner's row
 * uses it to gate a lazy bottle fetch.
 */
export const CellarBeerAccordion = ({
  expanded,
  onToggle,
  title,
  subtitle,
  style,
  abv,
  countLabel,
  children,
}: Props) => {
  const panelId = useId();

  return (
    <div className={cn(cardVariants, "overflow-hidden")}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
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
            expanded && "rotate-90",
          )}
        >
          <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">{title}</span>
          <span className="block text-sm text-muted-foreground">{subtitle}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <Badge variant="neutral">{style}</Badge>
          <Badge variant="accent">{abv} %</Badge>
        </span>
        <span className="w-16 shrink-0 text-right text-sm font-semibold text-foreground">
          {countLabel}
        </span>
      </button>
      <div id={panelId} hidden={!expanded} className="border-t border-border px-4 py-3 pl-11">
        {children}
      </div>
    </div>
  );
};

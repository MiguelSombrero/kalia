"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useJustAddedStore } from "./store";

/** A row of `BeerList`, highlighted once when it is the beer this browser just added. */
export const BeerRow = ({ beerId, className, children }: { beerId: string; className: string; children: ReactNode }) => {
  const isNew = useJustAddedStore((state) => state.beer?.id === beerId);
  const focusPending = useJustAddedStore((state) => state.focusPending);
  const focusTaken = useJustAddedStore((state) => state.focusTaken);
  const row = useRef<HTMLLIElement>(null);

  // The dialog's trigger is gone once the search finds the beer, so Radix's focus restore lands on <body>.
  useEffect(() => {
    if (!isNew || !focusPending) return;
    row.current?.querySelector("a")?.focus();
    focusTaken();
  }, [isNew, focusPending, focusTaken]);

  return (
    <li ref={row} className={cn(className, isNew && "motion-safe:animate-feed-reveal")}>
      {children}
    </li>
  );
};

export const JustAddedBadge = ({ beerId }: { beerId: string }) => {
  const { t } = useTranslation();
  const isNew = useJustAddedStore((state) => state.beer?.id === beerId);
  return isNew ? <Badge variant="accent">{t("catalog.add.justAdded")}</Badge> : null;
};

/** On a beer's own page: where an add lands when the search for its name would not show it (ADR-0082). */
export const JustAddedLanding = ({ beerId }: { beerId: string }) => {
  const isNew = useJustAddedStore((state) => state.beer?.id === beerId);
  const focusPending = useJustAddedStore((state) => state.focusPending);
  const focusTaken = useJustAddedStore((state) => state.focusTaken);

  useEffect(() => {
    if (!isNew || !focusPending) return;
    // Page's skip-link target (components/ui/page.tsx), already focusable.
    document.getElementById("main-content")?.focus();
    focusTaken();
  }, [isNew, focusPending, focusTaken]);

  return null;
};

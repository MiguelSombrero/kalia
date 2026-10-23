"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Toast, ToastDescription, ToastProvider, ToastViewport } from "@/components/ui/toast";
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

/** Mounted once per catalog page, outside the list the dialog that added the beer lived in. */
export const JustAddedToast = () => {
  const { t } = useTranslation();
  const beer = useJustAddedStore((state) => state.beer);
  const open = useJustAddedStore((state) => state.toastOpen);
  const dismissToast = useJustAddedStore((state) => state.dismissToast);

  return (
    <ToastProvider swipeDirection="right">
      <Toast variant="success" open={open && beer !== null} onOpenChange={(next) => !next && dismissToast()}>
        <ToastDescription className="flex-1 text-sm text-foreground">
          {beer && t("catalog.add.added", { beer: beer.name })}
        </ToastDescription>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
};

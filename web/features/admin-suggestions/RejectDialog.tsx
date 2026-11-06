"use client";

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { REJECTION_REASONS, type RejectionReason, type SuggestionRow } from "./types";

export const RejectDialog = ({
  suggestion,
  hasPendingSibling,
  disabled,
  onReject,
}: {
  suggestion: SuggestionRow;
  /** Another waiting suggestion needs this suggestion's new brewery, so rejecting leaves it pending. */
  hasPendingSibling: boolean;
  disabled: boolean;
  onReject: (reason: RejectionReason) => void;
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<RejectionReason | null>(null);
  const ids = useId();

  const confirm = () => {
    if (reason === null) return;
    setIsOpen(false);
    setReason(null);
    onReject(reason);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setReason(null);
      }}
    >
      <DialogTrigger disabled={disabled} className={cn(buttonVariants("outline"), "disabled:opacity-50")}>
        {t("admin.review.action.reject")}
      </DialogTrigger>
      <DialogContent aria-describedby={`${ids}-description`}>
        <DialogTitle>{t("admin.review.reject.title")}</DialogTitle>
        <DialogDescription id={`${ids}-description`}>
          {t("admin.review.reject.lead", { beer: suggestion.name, brewery: suggestion.brewery.name })}
        </DialogDescription>
        <fieldset className="mt-4 flex flex-col gap-2">
          <legend className="pb-2 text-label font-semibold uppercase text-muted-foreground">
            {t("admin.review.reject.why")}
          </legend>
          {REJECTION_REASONS.map((value) => (
            <label
              key={value}
              className={cn(
                "flex min-h-10 cursor-pointer items-start gap-3 border border-border bg-surface px-3 py-2",
                reason === value && "bg-accent",
              )}
            >
              <input
                type="radio"
                name={`${ids}-reason`}
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="mt-1 size-4 accent-primary"
              />
              <span>{t(`admin.review.reason.${value}`)}</span>
            </label>
          ))}
        </fieldset>
        {suggestion.breweryIsNew && (
          <p className="mt-3 text-sm text-muted-foreground">
            {hasPendingSibling
              ? t("admin.review.reject.breweryStays", { brewery: suggestion.brewery.name })
              : t("admin.review.reject.breweryWith", { brewery: suggestion.brewery.name })}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <DialogClose className={buttonVariants("outline")}>{t("admin.review.reject.cancel")}</DialogClose>
          <Button type="button" variant="destructive" disabled={reason === null} onClick={confirm}>
            {t("admin.review.reject.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

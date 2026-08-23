"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
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
import { containerTypes } from "./addBottleSchema";
import { type EditBottleFormValues, editBottleSchema } from "./editBottleSchema";
import { useUpdateBottle } from "./hooks/useBottles";
import type { Bottle } from "./types";

const fieldClasses =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground";

export const EditBottleDialog = ({ bottle, beerName }: { bottle: Bottle; beerName: string }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const updateBottle = useUpdateBottle();
  const ids = useId();

  const form = useForm<EditBottleFormValues>({
    resolver: zodResolver(editBottleSchema),
    defaultValues: {
      containerType: bottle.containerType,
      brewedDate: bottle.brewedDate ?? "",
      bestBeforeDate: bottle.bestBeforeDate ?? "",
    },
  });

  const errors = form.formState.errors;
  const describedBy = (field: keyof EditBottleFormValues) =>
    errors[field] ? `${ids}-${field}-error` : undefined;

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    updateBottle.reset();
    // Resetting to `bottle` (current props) here, not on close: the mount-time
    // `defaultValues` above go stale the moment an edit saves, since nothing
    // re-runs `useForm` when the parent re-renders with the updated bottle —
    // resetting on open instead means each open reflects whatever the bottle
    // looks like right then, including an edit made in an earlier open.
    if (open) {
      form.reset({
        containerType: bottle.containerType,
        brewedDate: bottle.brewedDate ?? "",
        bestBeforeDate: bottle.bestBeforeDate ?? "",
      });
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    updateBottle.mutate(
      {
        id: bottle.id,
        request: {
          containerType: values.containerType,
          brewedDate: values.brewedDate || undefined,
          bestBeforeDate: values.bestBeforeDate || undefined,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger className={buttonVariants("outline")}>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
        >
          <path
            d="M13.5 3.5l3 3L7 16l-4 1 1-4 9.5-9.5z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t("cellar.edit.action")}
      </DialogTrigger>
      <DialogContent aria-describedby={`${ids}-description`}>
        <DialogTitle>{t("cellar.edit.title")}</DialogTitle>
        <DialogDescription id={`${ids}-description`}>
          {t("cellar.edit.description", { beer: beerName })}
        </DialogDescription>

        {/* noValidate: matches AddBottleDialog — native constraint validation
            would replace the localized messages below with a browser tooltip. */}
        <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor={`${ids}-containerType`} className="text-sm font-medium text-foreground">
              {t("cellar.edit.containerType")}
            </label>
            <select
              id={`${ids}-containerType`}
              className={fieldClasses}
              {...form.register("containerType")}
            >
              {containerTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`cellar.bottle.container.${type}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${ids}-brewedDate`} className="text-sm font-medium text-foreground">
              {t("cellar.edit.brewedDate")}
            </label>
            <input
              id={`${ids}-brewedDate`}
              type="date"
              className={fieldClasses}
              aria-invalid={Boolean(errors.brewedDate)}
              aria-describedby={describedBy("brewedDate")}
              {...form.register("brewedDate")}
            />
            {errors.brewedDate && (
              <p id={`${ids}-brewedDate-error`} className="mt-1 text-sm text-foreground">
                {t(errors.brewedDate.message ?? "")}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${ids}-bestBeforeDate`} className="text-sm font-medium text-foreground">
              {t("cellar.edit.bestBeforeDate")}
            </label>
            <input
              id={`${ids}-bestBeforeDate`}
              type="date"
              className={fieldClasses}
              aria-invalid={Boolean(errors.bestBeforeDate)}
              aria-describedby={describedBy("bestBeforeDate")}
              {...form.register("bestBeforeDate")}
            />
            {errors.bestBeforeDate && (
              <p id={`${ids}-bestBeforeDate-error`} className="mt-1 text-sm text-foreground">
                {t(errors.bestBeforeDate.message ?? "")}
              </p>
            )}
          </div>

          {updateBottle.isError && (
            <p role="alert" className="text-sm text-foreground">
              {t("cellar.edit.error.failed")}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose className={buttonVariants("outline")}>{t("cellar.edit.cancel")}</DialogClose>
            <Button type="submit" variant="primary" disabled={updateBottle.isPending}>
              {updateBottle.isPending ? t("cellar.edit.submitting") : t("cellar.edit.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

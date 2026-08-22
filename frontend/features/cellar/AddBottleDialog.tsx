"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import {
  type AddBottleFormValues,
  addBottleSchema,
  containerTypes,
  MAX_QUANTITY,
  MIN_QUANTITY,
} from "./addBottleSchema";
import { useAddBottle } from "./hooks/useBottles";

const fieldClasses =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground";

export const AddBottleDialog = ({ beerId, beerName }: { beerId: string; beerName: string }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const addBottle = useAddBottle();
  const ids = useId();

  const form = useForm<AddBottleFormValues>({
    resolver: zodResolver(addBottleSchema),
    defaultValues: {
      containerType: "BOTTLE",
      brewedDate: "",
      bestBeforeDate: "",
      quantity: MIN_QUANTITY,
    },
  });

  const quantity = useWatch({ control: form.control, name: "quantity" });
  const steppedQuantity = Number.isFinite(quantity) ? quantity : MIN_QUANTITY;
  const setQuantity = (value: number) =>
    form.setValue("quantity", value, { shouldValidate: true });

  const errors = form.formState.errors;
  const describedBy = (field: keyof AddBottleFormValues) =>
    errors[field] ? `${ids}-${field}-error` : undefined;

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset();
      addBottle.reset();
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    addBottle.mutate(
      {
        beerId,
        containerType: values.containerType,
        quantity: values.quantity,
        brewedDate: values.brewedDate || undefined,
        bestBeforeDate: values.bestBeforeDate || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger className={buttonVariants("outline")}>{t("cellar.add.action")}</DialogTrigger>
      <DialogContent aria-describedby={`${ids}-description`}>
        <DialogTitle>{t("cellar.add.title")}</DialogTitle>
        <DialogDescription id={`${ids}-description`}>
          {t("cellar.add.description", { beer: beerName })}
        </DialogDescription>

        {/* noValidate: min/max stay for the spinbutton's range semantics, but
            native constraint validation would block submit and replace the
            localized messages below with an unlocalized browser tooltip. */}
        <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor={`${ids}-containerType`} className="text-sm font-medium text-foreground">
              {t("cellar.add.containerType")}
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
              {t("cellar.add.brewedDate")}
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
              {t("cellar.add.bestBeforeDate")}
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

          <div>
            <label htmlFor={`${ids}-quantity`} className="text-sm font-medium text-foreground">
              {t("cellar.add.quantity")}
            </label>
            <div className="mt-1 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                aria-label={t("cellar.add.quantityDecrease")}
                disabled={steppedQuantity <= MIN_QUANTITY}
                onClick={() => setQuantity(steppedQuantity - 1)}
              >
                −
              </Button>
              <input
                id={`${ids}-quantity`}
                type="number"
                inputMode="numeric"
                min={MIN_QUANTITY}
                max={MAX_QUANTITY}
                className={cn(fieldClasses, "mt-0 w-20 text-center")}
                aria-invalid={Boolean(errors.quantity)}
                aria-describedby={describedBy("quantity")}
                {...form.register("quantity", { valueAsNumber: true })}
              />
              <Button
                type="button"
                variant="outline"
                aria-label={t("cellar.add.quantityIncrease")}
                disabled={steppedQuantity >= MAX_QUANTITY}
                onClick={() => setQuantity(steppedQuantity + 1)}
              >
                +
              </Button>
            </div>
            {errors.quantity && (
              <p id={`${ids}-quantity-error`} className="mt-1 text-sm text-foreground">
                {t(errors.quantity.message ?? "")}
              </p>
            )}
          </div>

          {addBottle.isError && (
            <p role="alert" className="text-sm text-foreground">
              {t("cellar.add.error.failed")}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <DialogClose className={buttonVariants("outline")}>{t("cellar.add.cancel")}</DialogClose>
            <Button type="submit" variant="primary" disabled={addBottle.isPending}>
              {addBottle.isPending ? t("cellar.add.submitting") : t("cellar.add.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

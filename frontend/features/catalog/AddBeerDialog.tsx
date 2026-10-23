"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";
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
import { ErrorAlert } from "@/components/ui/error-alert";
import { FieldError, fieldClasses } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/settings";
import { addBeerSchema, type AddBeerFormValues, toAddBeerRequest } from "./addBeerSchema";
import { BreweryField } from "./BreweryField";
import { useAddBeer, useAddBeerOptions } from "./hooks/useAddBeer";
import { beerHref, catalogHref } from "./links";
import { SimilarBeers } from "./SimilarBeers";
import { useJustAddedStore } from "./store";
import type { AddBeerOutcome, BreweryOption } from "./types";

export type AddBeerTrigger = "button" | "link";

const triggerClasses: Record<AddBeerTrigger, string> = {
  button: buttonVariants("primary"),
  link: "inline-block py-1 font-semibold text-foreground underline underline-offset-2 hover:text-primary",
};

const emptyValues = (name: string): AddBeerFormValues => ({
  name,
  breweryMode: "unset",
  breweryId: "",
  newBreweryName: "",
  newBreweryCountry: "",
  newBreweryCity: "",
  style: "",
  abv: "",
});

// Where a refused request field (as the API names it) shows on the form.
const REFUSABLE: Record<string, keyof AddBeerFormValues> = {
  name: "name",
  style: "style",
  abv: "abv",
  breweryId: "breweryId",
  "newBrewery.name": "newBreweryName",
  "newBrewery.countryCode": "newBreweryCountry",
  "newBrewery.city": "newBreweryCity",
};

const labelClasses = "text-sm font-medium text-foreground";

export const AddBeerDialog = ({
  locale,
  initialName = "",
  trigger,
}: {
  locale: Locale;
  /** The search term that found nothing, carried in as the beer's name. */
  initialName?: string;
  trigger: AddBeerTrigger;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const ids = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [breweryText, setBreweryText] = useState("");
  const [picked, setPicked] = useState<BreweryOption | null>(null);
  const breweryListOpen = useRef(false);
  const options = useAddBeerOptions(locale, isOpen);
  const addBeer = useAddBeer();
  const announce = useJustAddedStore((state) => state.announce);

  const form = useForm<AddBeerFormValues>({
    resolver: zodResolver(addBeerSchema),
    defaultValues: emptyValues(initialName),
  });
  const [breweryMode, beerName] = useWatch({ control: form.control, name: ["breweryMode", "name"] });
  const errors = form.formState.errors;
  const errorText = (field: keyof AddBeerFormValues) => {
    const message = errors[field]?.message;
    return message ? t(message) : undefined;
  };
  const describedBy = (field: keyof AddBeerFormValues) => (errors[field] ? `${ids}-${field}-error` : undefined);

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    form.reset(emptyValues(initialName));
    setBreweryText("");
    setPicked(null);
    addBeer.reset();
  };

  const onBreweryListOpenChange = useCallback((open: boolean) => {
    breweryListOpen.current = open;
  }, []);

  const pickBrewery = (brewery: BreweryOption) => {
    setPicked(brewery);
    setBreweryText(brewery.name);
    form.setValue("breweryMode", "existing");
    form.setValue("breweryId", brewery.id, { shouldValidate: form.formState.isSubmitted });
    form.setValue("newBreweryName", "");
  };

  const typeBrewery = (text: string) => {
    setBreweryText(text);
    setPicked(null);
    if (form.getValues("breweryMode") === "existing") {
      form.setValue("breweryMode", "unset");
      form.setValue("breweryId", "");
    }
  };

  const showOutcome = (outcome: AddBeerOutcome) => {
    if (outcome.kind === "added") {
      announce(outcome.beer);
      onOpenChange(false);
      router.push(
        outcome.landsOnSearch ? catalogHref(locale, { query: outcome.beer.name }) : beerHref(locale, outcome.beer.id),
      );
    } else if (outcome.kind === "refused") {
      for (const refusal of outcome.fields) {
        const field = REFUSABLE[refusal.field];
        if (field) form.setError(field, { type: "server", message: "catalog.add.error.refusedField" });
      }
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    addBeer.mutate({ request: toAddBeerRequest(values), locale }, { onSuccess: showOutcome });
  });

  const outcome = addBeer.data;
  const refusedMarked =
    outcome?.kind === "refused" && outcome.fields.some((refusal) => REFUSABLE[refusal.field] !== undefined);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger className={triggerClasses[trigger]}>{t("catalog.add.action")}</DialogTrigger>
      <DialogContent
        aria-describedby={`${ids}-description`}
        onEscapeKeyDown={(event) => {
          if (breweryListOpen.current) event.preventDefault();
        }}
      >
        <DialogTitle>{t("catalog.add.title")}</DialogTitle>
        <DialogDescription id={`${ids}-description`}>{t("catalog.add.description")}</DialogDescription>

        {options.isError ? (
          <ErrorAlert
            className="mt-4"
            action={
              <Button type="button" variant="outline" pending={options.isFetching} onClick={() => options.refetch()}>
                {t("catalog.add.retry")}
              </Button>
            }
          >
            {t("catalog.add.optionsFailed")}
          </ErrorAlert>
        ) : !options.data ? (
          <div className="mt-4 flex flex-col gap-4" data-testid="add-beer-skeleton">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10" />
              </div>
            ))}
          </div>
        ) : (
          // noValidate: the Zod messages below are localized; the browser's are not.
          <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor={`${ids}-name`} className={labelClasses}>
                {t("catalog.add.name")}
              </label>
              <input
                id={`${ids}-name`}
                type="text"
                className={fieldClasses}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy("name")}
                {...form.register("name")}
              />
              {errors.name && <FieldError id={`${ids}-name-error`}>{errorText("name")}</FieldError>}
            </div>

            <BreweryField
              id={`${ids}-brewery`}
              locale={locale}
              text={breweryText}
              picked={picked}
              error={errorText("breweryId")}
              onTextChange={typeBrewery}
              onListOpenChange={onBreweryListOpenChange}
              onChoose={(choice) => {
                if (choice.kind === "existing") {
                  pickBrewery(choice.brewery);
                } else {
                  setBreweryText(choice.name);
                  setPicked(null);
                  form.setValue("breweryMode", "new");
                  form.setValue("breweryId", "");
                  form.setValue("newBreweryName", choice.name);
                  form.clearErrors("breweryId");
                }
              }}
            />

            {picked && (
              <SimilarBeers locale={locale} breweryId={picked.id} breweryName={picked.name} beerName={beerName} />
            )}

            {breweryMode === "new" && (
              <fieldset className="flex flex-col gap-4 border-l border-border pl-4">
                <legend className="mb-3 text-label font-semibold uppercase text-foreground">
                  {t("catalog.add.newBrewery")}
                </legend>
                <div>
                  <label htmlFor={`${ids}-newBreweryName`} className={labelClasses}>
                    {t("catalog.add.breweryName")}
                  </label>
                  <input
                    id={`${ids}-newBreweryName`}
                    type="text"
                    className={fieldClasses}
                    aria-invalid={Boolean(errors.newBreweryName)}
                    aria-describedby={describedBy("newBreweryName")}
                    {...form.register("newBreweryName")}
                  />
                  {errors.newBreweryName && (
                    <FieldError id={`${ids}-newBreweryName-error`}>{errorText("newBreweryName")}</FieldError>
                  )}
                </div>
                <div>
                  <label htmlFor={`${ids}-newBreweryCountry`} className={labelClasses}>
                    {t("catalog.add.country")}
                  </label>
                  <select
                    id={`${ids}-newBreweryCountry`}
                    className={fieldClasses}
                    aria-invalid={Boolean(errors.newBreweryCountry)}
                    aria-describedby={describedBy("newBreweryCountry")}
                    {...form.register("newBreweryCountry")}
                  >
                    <option value="">{t("catalog.add.countryPlaceholder")}</option>
                    {options.data.countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {errors.newBreweryCountry && (
                    <FieldError id={`${ids}-newBreweryCountry-error`}>{errorText("newBreweryCountry")}</FieldError>
                  )}
                </div>
                <div>
                  <label htmlFor={`${ids}-newBreweryCity`} className={labelClasses}>
                    {t("catalog.add.city")}
                  </label>
                  <input
                    id={`${ids}-newBreweryCity`}
                    type="text"
                    className={fieldClasses}
                    aria-invalid={Boolean(errors.newBreweryCity)}
                    aria-describedby={describedBy("newBreweryCity")}
                    {...form.register("newBreweryCity")}
                  />
                  {errors.newBreweryCity && (
                    <FieldError id={`${ids}-newBreweryCity-error`}>{errorText("newBreweryCity")}</FieldError>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{t("catalog.add.newBreweryNoBeers")}</p>
              </fieldset>
            )}

            <div>
              <label htmlFor={`${ids}-style`} className={labelClasses}>
                {t("catalog.add.style")}
              </label>
              <select
                id={`${ids}-style`}
                className={fieldClasses}
                aria-invalid={Boolean(errors.style)}
                aria-describedby={describedBy("style")}
                {...form.register("style")}
              >
                <option value="">{t("catalog.add.stylePlaceholder")}</option>
                {options.data.styles.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
              {errors.style && <FieldError id={`${ids}-style-error`}>{errorText("style")}</FieldError>}
            </div>

            <div>
              <label htmlFor={`${ids}-abv`} className={labelClasses}>
                {t("catalog.add.abv")}
              </label>
              <input
                id={`${ids}-abv`}
                type="text"
                inputMode="decimal"
                className={fieldClasses}
                aria-invalid={Boolean(errors.abv)}
                aria-describedby={describedBy("abv")}
                {...form.register("abv")}
              />
              {errors.abv && <FieldError id={`${ids}-abv-error`}>{errorText("abv")}</FieldError>}
            </div>

            {outcome?.kind === "duplicateBeer" && (
              <ErrorAlert
                action={
                  <Link
                    href={beerHref(locale, outcome.existing.id)}
                    className="text-sm font-semibold text-foreground underline underline-offset-2 hover:text-primary"
                  >
                    {t("catalog.add.duplicateOpen", { beer: outcome.existing.name })}
                  </Link>
                }
              >
                <span className="font-semibold">
                  {outcome.existing.breweryName
                    ? t("catalog.add.duplicateBeer", {
                        beer: outcome.existing.name,
                        brewery: outcome.existing.breweryName,
                      })
                    : t("catalog.add.duplicateBeerNoBrewery", { beer: outcome.existing.name })}
                </span>{" "}
                <span className="text-muted-foreground">{t("catalog.add.duplicateHint")}</span>
              </ErrorAlert>
            )}
            {outcome?.kind === "duplicateBrewery" && (
              <ErrorAlert
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      pickBrewery(outcome.existing);
                      addBeer.reset();
                    }}
                  >
                    {t("catalog.add.useBrewery")}
                  </Button>
                }
              >
                <span className="font-semibold">
                  {t("catalog.add.duplicateBrewery", {
                    brewery: outcome.existing.name,
                    place: outcome.existing.place,
                  })}
                </span>
              </ErrorAlert>
            )}
            {outcome?.kind === "refused" && (
              <ErrorAlert>{t(refusedMarked ? "catalog.add.refused" : "catalog.add.refusedUnmarked")}</ErrorAlert>
            )}
            {addBeer.isError && <ErrorAlert>{t("catalog.add.failed")}</ErrorAlert>}

            <div className="mt-2 flex justify-end gap-2">
              <DialogClose className={buttonVariants("outline")}>{t("catalog.add.cancel")}</DialogClose>
              <Button type="submit" variant="primary" pending={addBeer.isPending}>
                {addBeer.isPending ? t("catalog.add.submitting") : t("catalog.add.submit")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

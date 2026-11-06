"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { FieldError, fieldClasses } from "@/components/ui/field";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { beerHref } from "@/lib/routes";
import { BreweryPicker } from "./BreweryPicker";
import {
  editSuggestionSchema,
  initialValues,
  toEditRequest,
  type EditSuggestionValues,
} from "./editSuggestionSchema";
import { useApproveEditedSuggestion } from "./hooks/useDecision";
import { useEditOptions } from "./hooks/useEditOptions";
import type { BreweryOption, DecisionResult, EditOptions, EditResult, SuggestionRow } from "./types";

// Where a refused request field (as the API names it) shows on the form.
const REFUSABLE: Record<string, keyof EditSuggestionValues> = {
  name: "name",
  style: "style",
  abv: "abv",
  breweryId: "breweryId",
  "newBrewery.name": "newBreweryName",
  "newBrewery.countryCode": "newBreweryCountry",
  "newBrewery.city": "newBreweryCity",
};

type Refusal = Exclude<EditResult, DecisionResult>;

const labelClasses = "text-sm font-medium text-foreground";

export const EditSuggestionForm = ({
  suggestion,
  locale,
  loadOptions,
  findBreweries,
  onResult,
  onCancel,
}: {
  suggestion: SuggestionRow;
  locale: Locale;
  loadOptions: (locale: string) => Promise<EditOptions>;
  findBreweries: (query: string, locale: string) => Promise<BreweryOption[]>;
  onResult: (result: DecisionResult) => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const options = useEditOptions(loadOptions, locale);
  const approveEdited = useApproveEditedSuggestion();
  const initial = initialValues(suggestion);
  const form = useForm<EditSuggestionValues>({ resolver: zodResolver(editSuggestionSchema), defaultValues: initial });
  const values = useWatch({ control: form.control });
  const errors = form.formState.errors;
  const [picked, setPicked] = useState<BreweryOption | null>(
    suggestion.breweryIsNew ? null : { id: suggestion.brewery.id, name: suggestion.brewery.name, place: suggestion.brewery.place },
  );
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [failed, setFailed] = useState(false);

  const styles = [...new Set([suggestion.style, ...(options.data?.styles ?? [])])];
  const countries = options.data?.countries ?? [{ code: initial.newBreweryCountry, name: initial.newBreweryCountry }];
  const countryName = (code: string) => countries.find((country) => country.code === code)?.name ?? code;

  const pick = (brewery: BreweryOption) => {
    setPicked(brewery);
    form.setValue("breweryId", brewery.id, { shouldValidate: form.formState.isSubmitted });
  };
  const chooseExisting = (brewery: BreweryOption) => {
    form.setValue("breweryMode", "existing");
    setRefusal(null);
    pick(brewery);
  };

  const onSubmit = form.handleSubmit((submitted) => {
    setRefusal(null);
    setFailed(false);
    approveEdited
      .mutateAsync({ id: suggestion.id, request: toEditRequest(submitted) })
      .then((result) => {
        if (result.kind === "refused") {
          for (const { field } of result.fields) {
            const target = REFUSABLE[field];
            if (target) form.setError(target, { type: "server", message: "admin.review.edit.error.refusedField" });
          }
        }
        if (result.kind === "decided" || result.kind === "alreadyDecided" || result.kind === "gone") {
          onResult(result);
        } else {
          setRefusal(result);
        }
      })
      .catch(() => setFailed(true));
  });

  const message = (field: keyof EditSuggestionValues) => {
    const key = errors[field]?.message;
    return key ? t(key) : undefined;
  };
  const describedBy = (field: keyof EditSuggestionValues, ...extra: string[]) =>
    [...extra, errors[field] ? `edit-${field}-error` : undefined].filter(Boolean).join(" ") || undefined;
  const was = (id: string, differs: boolean, value: string) =>
    differs ? (
      <p id={id} className="mt-1 text-sm text-muted-foreground">
        {t("admin.review.edit.was", { value })}
      </p>
    ) : null;
  const fieldError = (field: keyof EditSuggestionValues) =>
    errors[field] ? (
      <FieldError id={`edit-${field}-error`}>{message(field)}</FieldError>
    ) : null;

  const alert = () => {
    if (failed) return <ErrorAlert>{t("admin.review.failed")}</ErrorAlert>;
    if (refusal === null) return null;
    switch (refusal.kind) {
      case "refused":
        return (
          <ErrorAlert>
            <strong>{t("admin.review.edit.refused.title")}</strong>{" "}
            {refusal.fields.some(({ field }) => REFUSABLE[field])
              ? t("admin.review.edit.refused.body")
              : t("admin.review.edit.refused.bodyUnplaced")}
          </ErrorAlert>
        );
      case "duplicateBeer":
        return (
          <ErrorAlert
            action={
              <a href={beerHref(locale, refusal.existingBeerId)} className={buttonVariants("outline", "compact")}>
                {t("admin.review.edit.duplicateBeer.open")}
              </a>
            }
          >
            <strong>{t("admin.review.edit.duplicateBeer.title")}</strong> {t("admin.review.edit.duplicateBeer.body")}
          </ErrorAlert>
        );
      case "duplicateBrewery": {
        const existing = { id: refusal.existing.id, name: refusal.existing.name, place: countryName(refusal.existing.countryCode) };
        return (
          <ErrorAlert
            action={
              <Button type="button" variant="outline" size="compact" onClick={() => chooseExisting(existing)}>
                {t("admin.review.edit.duplicateBrewery.use", { brewery: existing.name })}
              </Button>
            }
          >
            <strong>{t("admin.review.edit.duplicateBrewery.title")}</strong>{" "}
            {t("admin.review.edit.duplicateBrewery.body", { brewery: existing.name, place: existing.place })}
          </ErrorAlert>
        );
      }
      case "breweryApproved": {
        const approved = { id: suggestion.brewery.id, name: suggestion.brewery.name, place: suggestion.brewery.place };
        return (
          <ErrorAlert
            action={
              <Button type="button" variant="outline" size="compact" onClick={() => chooseExisting(approved)}>
                {t("admin.review.edit.duplicateBrewery.use", { brewery: approved.name })}
              </Button>
            }
          >
            <strong>{t("admin.review.edit.breweryApproved.title")}</strong> {t("admin.review.edit.breweryApproved.body")}
          </ErrorAlert>
        );
      }
    }
  };

  const mode = values.breweryMode ?? initial.breweryMode;
  const existingHint = suggestion.breweryIsNew
    ? t("admin.review.edit.wasNewBrewery", { brewery: suggestion.brewery.name })
    : picked?.id !== suggestion.brewery.id
      ? t("admin.review.edit.was", { value: suggestion.brewery.name })
      : null;

  const modeRadio = (value: "new" | "existing", label: string) => (
    <label
      className={cn(
        "flex min-h-10 cursor-pointer items-center gap-3 border border-border bg-surface px-3 py-2",
        mode === value && "bg-accent",
      )}
    >
      <input type="radio" value={value} {...form.register("breweryMode")} className="size-4 accent-primary" />
      <span>{label}</span>
    </label>
  );

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {options.isError && <ErrorAlert>{t("admin.review.edit.loadFailed")}</ErrorAlert>}
      {alert()}

      <div>
        <label htmlFor="edit-name" className={labelClasses}>{t("admin.review.edit.name")}</label>
        <input
          id="edit-name"
          type="text"
          className={fieldClasses}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name", "edit-name-was")}
          {...form.register("name")}
        />
        {fieldError("name")}
        {was("edit-name-was", values.name !== initial.name, initial.name)}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-style" className={labelClasses}>{t("admin.review.edit.style")}</label>
          <select
            id="edit-style"
            className={fieldClasses}
            aria-invalid={Boolean(errors.style)}
            aria-describedby={describedBy("style", "edit-style-was")}
            {...form.register("style")}
          >
            {styles.map((style) => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
          {fieldError("style")}
          {was("edit-style-was", values.style !== initial.style, initial.style)}
        </div>
        <div>
          <label htmlFor="edit-abv" className={labelClasses}>{t("admin.review.edit.abv")}</label>
          <input
            id="edit-abv"
            type="text"
            inputMode="decimal"
            className={fieldClasses}
            aria-invalid={Boolean(errors.abv)}
            aria-describedby={describedBy("abv", "edit-abv-was")}
            {...form.register("abv")}
          />
          {fieldError("abv")}
          {was("edit-abv-was", values.abv !== initial.abv, initial.abv)}
        </div>
      </div>

      {suggestion.breweryIsNew ? (
        <fieldset className="flex flex-col gap-2">
          <legend className={cn(labelClasses, "pb-2")}>{t("admin.review.edit.brewery")}</legend>
          {modeRadio("new", t("admin.review.edit.newBrewery"))}
          {mode === "new" && (
            <div className="flex flex-col gap-4 border-l border-border py-2 pl-4">
              <div>
                <label htmlFor="edit-newBreweryName" className={labelClasses}>{t("admin.review.edit.breweryName")}</label>
                <input
                  id="edit-newBreweryName"
                  type="text"
                  className={fieldClasses}
                  aria-invalid={Boolean(errors.newBreweryName)}
                  aria-describedby={describedBy("newBreweryName", "edit-newBreweryName-was")}
                  {...form.register("newBreweryName")}
                />
                {fieldError("newBreweryName")}
                {was("edit-newBreweryName-was", values.newBreweryName !== initial.newBreweryName, initial.newBreweryName)}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-newBreweryCountry" className={labelClasses}>{t("admin.review.edit.country")}</label>
                  <select
                    id="edit-newBreweryCountry"
                    className={fieldClasses}
                    aria-invalid={Boolean(errors.newBreweryCountry)}
                    aria-describedby={describedBy("newBreweryCountry", "edit-newBreweryCountry-was")}
                    {...form.register("newBreweryCountry")}
                  >
                    <option value="">{t("admin.review.edit.chooseCountry")}</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                  {fieldError("newBreweryCountry")}
                  {was(
                    "edit-newBreweryCountry-was",
                    values.newBreweryCountry !== initial.newBreweryCountry,
                    countryName(initial.newBreweryCountry),
                  )}
                </div>
                <div>
                  <label htmlFor="edit-newBreweryCity" className={labelClasses}>{t("admin.review.edit.city")}</label>
                  <input
                    id="edit-newBreweryCity"
                    type="text"
                    className={fieldClasses}
                    aria-invalid={Boolean(errors.newBreweryCity)}
                    aria-describedby={describedBy("newBreweryCity", "edit-newBreweryCity-was")}
                    {...form.register("newBreweryCity")}
                  />
                  {fieldError("newBreweryCity")}
                  {was("edit-newBreweryCity-was", values.newBreweryCity !== initial.newBreweryCity, initial.newBreweryCity)}
                </div>
              </div>
            </div>
          )}
          {modeRadio("existing", t("admin.review.edit.existingBrewery"))}
          {mode === "existing" && (
            <div className="border-l border-border py-2 pl-4">
              <BreweryPicker locale={locale} find={findBreweries} picked={picked} error={message("breweryId")} onPick={pick} />
              {existingHint && <p className="mt-1 text-sm text-muted-foreground">{existingHint}</p>}
            </div>
          )}
        </fieldset>
      ) : (
        <div className="flex flex-col gap-2">
          <span className={labelClasses}>{t("admin.review.edit.brewery")}</span>
          <BreweryPicker locale={locale} find={findBreweries} picked={picked} error={message("breweryId")} onPick={pick} />
          {existingHint && <p className="text-sm text-muted-foreground">{existingHint}</p>}
        </div>
      )}

      <p className="text-sm text-muted-foreground">{t("admin.review.edit.note")}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" pending={approveEdited.isPending} className="flex-1">
          {approveEdited.isPending ? t("admin.review.edit.saving") : t("admin.review.edit.save")}
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          {t("admin.review.edit.cancel")}
        </Button>
      </div>
    </form>
  );
};

"use client";

import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { fieldClasses, FieldError } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { useBreweryMatches } from "./hooks/useEditOptions";
import type { BreweryOption } from "./types";

const SEARCH_DELAY_MS = 250;

/** Finds an approved brewery to approve the beer under: a search, then one radio per match. */
export const BreweryPicker = ({
  locale,
  find,
  picked,
  error,
  describedBy,
  onPick,
}: {
  locale: string;
  find: (query: string, locale: string) => Promise<BreweryOption[]>;
  picked: BreweryOption | null;
  /** Already translated. */
  error?: string;
  describedBy?: string;
  onPick: (brewery: BreweryOption) => void;
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const ids = useId();
  const matches = useBreweryMatches(find, query, locale);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const answered = query !== "" && query === text.trim() && !matches.isFetching;

  return (
    <div className="flex flex-col gap-2">
      {picked && (
        <p id={`${ids}-chosen`} className="text-sm text-foreground">
          {t("admin.review.edit.chosen", { brewery: `${picked.name} · ${picked.place}` })}
        </p>
      )}
      <label htmlFor={`${ids}-search`} className="text-sm font-medium text-foreground">
        {t("admin.review.edit.findBrewery")}
      </label>
      <input
        id={`${ids}-search`}
        type="search"
        autoComplete="off"
        placeholder={t("admin.review.edit.findPlaceholder")}
        className={cn(fieldClasses, "mt-0")}
        value={text}
        aria-invalid={Boolean(error)}
        aria-describedby={cn(describedBy, picked && `${ids}-chosen`, error && `${ids}-error`) || undefined}
        onChange={(event) => setText(event.target.value)}
      />
      {error && <FieldError id={`${ids}-error`}>{error}</FieldError>}
      <div aria-live="polite">
        {query !== "" && matches.isFetching && !matches.data && (
          <p className="text-sm text-muted-foreground">{t("admin.review.edit.searching")}</p>
        )}
        {answered && matches.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("admin.review.edit.noMatches")}</p>
        )}
      </div>
      {query !== "" && (matches.data?.length ?? 0) > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="sr-only">{t("admin.review.edit.findBrewery")}</legend>
          {matches.data!.map((brewery) => (
            <label
              key={brewery.id}
              className={cn(
                "flex min-h-10 cursor-pointer items-baseline gap-2 border border-border bg-surface px-3 py-2 text-sm",
                picked?.id === brewery.id && "bg-accent",
              )}
            >
              <input
                type="radio"
                name={`${ids}-brewery`}
                checked={picked?.id === brewery.id}
                onChange={() => onPick(brewery)}
                className="size-4 accent-primary"
              />
              <span className="font-semibold text-foreground">{brewery.name}</span>
              <span className="text-muted-foreground">{brewery.place}</span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
};

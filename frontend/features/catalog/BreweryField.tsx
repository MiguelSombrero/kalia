"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { FieldError, fieldClasses } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { surfaceVariants } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { useBreweryMatches } from "./hooks/useAddBeer";
import type { BreweryOption } from "./types";

const SEARCH_DELAY_MS = 250;

type Choice = { kind: "existing"; brewery: BreweryOption } | { kind: "new"; name: string };

export const BreweryField = ({
  id,
  locale,
  text,
  picked,
  error,
  onTextChange,
  onChoose,
  onListOpenChange,
}: {
  id: string;
  locale: string;
  text: string;
  picked: BreweryOption | null;
  /** Already translated. */
  error?: string;
  onTextChange: (text: string) => void;
  onChoose: (choice: Choice) => void;
  onListOpenChange: (open: boolean) => void;
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(text);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const matches = useBreweryMatches(picked ? "" : query, locale);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const typed = text.trim();
  const answered = query === text && !matches.isFetching;
  const choices: Choice[] = typed
    ? [
        ...(matches.data ?? []).map((brewery): Choice => ({ kind: "existing", brewery })),
        { kind: "new", name: typed },
      ]
    : [];
  const open = focused && picked === null && choices.length > 0;

  useEffect(() => {
    onListOpenChange(open);
  }, [open, onListOpenChange]);

  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const activeIndex = Math.min(active, Math.max(choices.length - 1, 0));

  const choose = (choice: Choice) => {
    setActive(0);
    onChoose(choice);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + choices.length) % choices.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      // Until the search answers, the one option is a new brewery: a quick Enter would add a duplicate.
      if (answered) choose(choices[activeIndex]);
    } else if (event.key === "Escape") {
      setFocused(false);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {t("catalog.add.brewery")}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={cn(picked && `${id}-place`, error && `${id}-error`) || undefined}
        placeholder={t("catalog.add.breweryPlaceholder")}
        className={fieldClasses}
        value={text}
        onChange={(event) => {
          setActive(0);
          onTextChange(event.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
      />
      {picked && (
        <p id={`${id}-place`} className="mt-1 text-sm text-muted-foreground">
          {picked.place}
        </p>
      )}
      <div
        hidden={!open}
        className={cn(surfaceVariants, "absolute inset-x-0 z-10 mt-1 max-h-64 overflow-y-auto py-1")}
      >
        {matches.isFetching && !matches.data && (
          <p aria-hidden="true" className="px-3 py-2 text-sm text-muted-foreground">
            {t("catalog.add.searching")}
          </p>
        )}
        <ul id={listId} role="listbox" aria-label={t("catalog.add.brewery")}>
          {choices.map((choice, index) => (
            <li
              key={choice.kind === "existing" ? choice.brewery.id : "new"}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "flex cursor-pointer items-baseline gap-2 px-3 py-2 text-sm",
                index === activeIndex && "bg-surface-sunken",
                choice.kind === "new" && "border-t border-divider font-semibold text-primary",
              )}
              onMouseDown={(event) => {
                // Not onClick: the input's blur would close the list before a click lands.
                event.preventDefault();
                choose(choice);
              }}
              onMouseEnter={() => setActive(index)}
            >
              {choice.kind === "existing" ? (
                <>
                  <span className="font-semibold text-foreground">{choice.brewery.name}</span>
                  <span className="text-muted-foreground">{choice.brewery.place}</span>
                </>
              ) : (
                <>
                  <Icon name="plus" className="size-4 shrink-0 self-center" />
                  {t("catalog.add.newBreweryOption", { name: choice.name })}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      <p aria-live="polite" className="sr-only">
        {open && matches.isFetching ? t("catalog.add.searching") : ""}
      </p>
      {open && matches.isError && (
        <p className="mt-1 text-sm text-muted-foreground">{t("catalog.add.searchFailed")}</p>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
};

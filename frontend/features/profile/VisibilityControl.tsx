"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Toast, ToastDescription, ToastProvider, ToastViewport, type ToastVariant } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useChangeVisibility } from "./hooks/useProfile";
import { visibilityTiles } from "./layout";

export type CellarTotals = { beers: number; bottles: number };

const subscribeToNothing = () => () => {};

type Outcome = { variant: ToastVariant; message: string; id: number };

type Props = { username: string; initialCellarPublic: boolean; counts: CellarTotals | null };

export const VisibilityControl = ({ username, initialCellarPublic, counts }: Props) => {
  const { t } = useTranslation();
  const ids = useId();
  const [cellarPublic, setCellarPublic] = useState(initialCellarPublic);
  const [confirming, setConfirming] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const changeVisibility = useChangeVisibility();
  const question = useRef<HTMLParagraphElement>(null);
  const outcomes = useRef(0);
  const publicPath = `/cellars/${username}`;
  const saving = changeVisibility.isPending;
  // The Clipboard API exists only in a secure context; elsewhere Copy link could only fail.
  const canCopy = useSyncExternalStore(
    subscribeToNothing,
    () => Boolean(navigator.clipboard),
    () => false,
  );

  useEffect(() => {
    if (confirming) question.current?.focus();
  }, [confirming]);

  const report = (variant: ToastVariant, message: string) => {
    outcomes.current += 1;
    setOutcome({ variant, message, id: outcomes.current });
  };

  const save = (next: boolean) => {
    const previous = cellarPublic;
    setCellarPublic(next);
    setConfirming(false);
    setOutcome(null);
    changeVisibility.mutate(next, {
      onSuccess: () =>
        report("success", t(next ? "profile.visibility.saved.public" : "profile.visibility.saved.private")),
      onError: () => {
        // Rolls the displayed state back to what the server still has —
        // an optimistic toggle that silently keeps the failed value would
        // tell the user their cellar is public when it is not.
        setCellarPublic(previous);
        report("destructive", t("profile.visibility.error"));
      },
    });
  };

  const choose = (next: boolean) => {
    if (next === cellarPublic) {
      setConfirming(false);
    } else if (next) {
      setConfirming(true);
    } else {
      save(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(publicPath, window.location.origin).toString());
      report("success", t("profile.visibility.address.copied"));
    } catch {
      report("destructive", t("profile.visibility.address.copyError"));
    }
  };

  const cellarLine =
    counts && counts.beers > 0
      ? t("profile.visibility.publicShows.cellar", {
          beers: t("cellar.count.beers", { count: counts.beers }),
          bottles: t("cellar.entry.bottleCount", { count: counts.bottles }),
        })
      : t("profile.visibility.publicShows.cellarUncounted");

  const choices = [
    {
      key: "private",
      value: false,
      title: t("profile.visibility.private"),
      lines: [
        { shown: true, text: t("profile.visibility.privateShows.alone") },
        { shown: true, text: t("profile.visibility.privateShows.notFound") },
        { shown: true, text: t("profile.visibility.privateShows.noFeed") },
      ],
    },
    {
      key: "public",
      value: true,
      title: t("profile.visibility.public"),
      lines: [
        { shown: true, text: cellarLine },
        { shown: true, text: t("profile.visibility.publicShows.feed") },
        { shown: false, text: t("profile.visibility.publicShows.never") },
      ],
    },
  ];

  return (
    <section aria-labelledby={`${ids}-heading`} className="flex flex-col gap-4">
      <h2 id={`${ids}-heading`} className="font-display text-heading font-bold text-foreground">
        {t("profile.visibility.heading")}
      </h2>

      <div className="grid gap-x-4 md:grid-cols-2">
        <div role="radiogroup" aria-labelledby={`${ids}-heading`} className={cn(visibilityTiles, "md:col-span-2")}>
          {choices.map((choice) => {
            const checked = choice.value === cellarPublic;
            return (
              <div
                key={choice.key}
                className={cn(
                  "relative flex flex-col rounded-surface border border-border bg-surface",
                  checked ? "ring-2 ring-inset ring-foreground" : "hover:bg-surface-sunken",
                )}
              >
                {checked && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-px -right-px bg-foreground px-2 py-1 text-label font-semibold uppercase text-background"
                  >
                    {t("profile.visibility.current")}
                  </span>
                )}
                <label className="flex cursor-pointer items-center gap-3 px-4 pt-4 pb-3 after:absolute after:inset-0">
                  <span className="relative z-10 flex size-6 shrink-0">
                    <input
                      type="radio"
                      name={`${ids}-visibility`}
                      checked={checked}
                      onChange={() => choose(choice.value)}
                      disabled={saving}
                      aria-describedby={`${ids}-${choice.key}-shows`}
                      className="peer size-6 cursor-pointer appearance-none rounded-control border border-border bg-surface disabled:cursor-progress"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-1.5 hidden bg-foreground peer-checked:block"
                    />
                  </span>
                  <span className="text-xl font-bold text-foreground">{choice.title}</span>
                </label>
                <ul id={`${ids}-${choice.key}-shows`} className="flex flex-col gap-2 pr-4 pb-4 pl-13 text-sm">
                  {choice.lines.map((line) => (
                    <li
                      key={line.text}
                      className={cn("flex items-start gap-2", line.shown ? "text-foreground" : "text-muted-foreground")}
                    >
                      <Icon name={line.shown ? "check" : "close"} className="mt-0.5 size-4" />
                      <span>{line.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {confirming && (
          <div
            role="group"
            aria-labelledby={`${ids}-question`}
            className="-mt-px flex flex-col gap-3 rounded-surface border border-t-0 border-border bg-surface-sunken p-4 md:col-start-2"
          >
            <p
              id={`${ids}-question`}
              ref={question}
              tabIndex={-1}
              className="text-xl font-bold text-foreground"
            >
              {t("profile.visibility.confirm.question")}
            </p>
            <p className="text-sm text-foreground">{t("profile.visibility.confirm.body")}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
                {t("profile.visibility.confirm.keep")}
              </Button>
              <Button type="button" variant="primary" disabled={saving} onClick={() => save(true)}>
                {t("profile.visibility.confirm.publish")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {cellarPublic && (
        <div className="grid rounded-surface border border-border md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <p className="flex min-w-0 flex-col gap-1 px-4 py-3.5">
            <span className="text-label font-semibold uppercase text-muted-foreground">
              {t("profile.visibility.address.label")}
            </span>
            <span className="text-lg font-semibold break-all text-foreground">{publicPath}</span>
          </p>
          <div className="flex flex-wrap gap-2 px-4 pb-4 md:py-3.5">
            {canCopy && (
              <Button type="button" variant="outline" onClick={copyLink}>
                {t("profile.visibility.address.copy")}
              </Button>
            )}
            <Link
              href={publicPath}
              aria-label={t("profile.visibility.address.openLabel")}
              className={buttonVariants("outline")}
            >
              {t("profile.visibility.address.open")}
              <Icon name="arrow" className="size-4" />
            </Link>
          </div>
        </div>
      )}

      <ToastProvider swipeDirection="right">
        {outcome && (
          <Toast key={outcome.id} variant={outcome.variant} open onOpenChange={(open) => !open && setOutcome(null)}>
            <ToastDescription className="flex-1 text-sm text-foreground">{outcome.message}</ToastDescription>
          </Toast>
        )}
        <ToastViewport />
      </ToastProvider>
    </section>
  );
};

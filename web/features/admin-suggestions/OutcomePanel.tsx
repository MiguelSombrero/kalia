"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Icon } from "@/components/ui/icon";
import { surfaceVariants } from "@/components/ui/surface";
import type { Locale } from "@/i18n/settings";
import { SuggestionHeader } from "./SuggestionHeader";
import type { Outcome } from "./types";

const DecidedBox = ({ children }: { children: React.ReactNode }) => (
  <div role="status" className={`${surfaceVariants} flex items-stretch`}>
    <span
      aria-hidden="true"
      className="flex w-12 shrink-0 items-center justify-center border-r border-border bg-success text-success-foreground"
    >
      <Icon name="check" strokeWidth={2.5} />
    </span>
    <div className="flex min-w-0 flex-1 flex-col items-start gap-3 px-4 py-3.5 text-sm text-foreground">{children}</div>
  </div>
);

export const OutcomePanel = ({
  outcome,
  locale,
  hasNext,
  onNext,
}: {
  outcome: Outcome;
  locale: Locale;
  hasNext: boolean;
  onNext: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const { suggestion } = outcome;
  const next = (
    <Button type="button" onClick={onNext}>
      {hasNext ? t("admin.review.outcome.next") : t("admin.review.outcome.toQueue")}
    </Button>
  );

  const body = () => {
    if (outcome.kind === "gone") {
      return (
        <ErrorAlert action={next}>
          <strong>{t("admin.review.gone.title")}</strong> {t("admin.review.gone.body")}
        </ErrorAlert>
      );
    }
    if (outcome.kind === "alreadyDecided") {
      const verb = t(`admin.review.conflict.verb.${outcome.outcome}`);
      const when = outcome.decidedAt
        ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(outcome.decidedAt))
        : undefined;
      return (
        <ErrorAlert action={next}>
          <strong>{t("admin.review.conflict.title")}</strong>{" "}
          {when ? t("admin.review.conflict.body", { verb, when }) : t("admin.review.conflict.bodyUntimed", { verb })}
        </ErrorAlert>
      );
    }
    const { decision, edited } = outcome;
    const beer = decision.name;
    const brewery = decision.brewery.name;
    const both = suggestion.breweryIsNew && decision.brewery.id === suggestion.brewery.id;
    if (decision.outcome === "REJECTED") {
      return (
        <DecidedBox>
          <p>
            {t("admin.review.outcome.rejected", { reason: t(`admin.review.reason.${decision.reason ?? "INCORRECT_DETAILS"}`) })}
            {both &&
              ` ${
                decision.breweryStatus === "PENDING"
                  ? t("admin.review.outcome.rejectedBreweryStays", { brewery })
                  : t("admin.review.outcome.rejectedBreweryWith", { brewery })
              }`}
          </p>
          {next}
        </DecidedBox>
      );
    }
    const key = edited ? (both ? "approvedEditedBoth" : "approvedEdited") : both ? "approvedBoth" : "approved";
    return (
      <DecidedBox>
        <p>{t(`admin.review.outcome.${key}`, { beer, brewery })}</p>
        {next}
      </DecidedBox>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <SuggestionHeader suggestion={suggestion} locale={locale} />
      {body()}
    </div>
  );
};

"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import type { Locale } from "@/i18n/settings";
import { EditSuggestionForm } from "./EditSuggestionForm";
import { useApproveSuggestion, useRejectSuggestion } from "./hooks/useDecision";
import { RejectDialog } from "./RejectDialog";
import { SuggestionHeader } from "./SuggestionHeader";
import type { BreweryOption, DecisionResult, EditOptions, RejectionReason, SuggestionRow } from "./types";

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 border-t border-divider py-3 first:border-t-0">
    <dt className="text-label font-semibold uppercase text-muted-foreground">{label}</dt>
    <dd className="[overflow-wrap:anywhere]">{children}</dd>
  </div>
);

export const SuggestionView = ({
  suggestion,
  locale,
  hasPendingSibling,
  loadOptions,
  findBreweries,
  onResult,
}: {
  suggestion: SuggestionRow;
  locale: Locale;
  hasPendingSibling: boolean;
  loadOptions: (locale: string) => Promise<EditOptions>;
  findBreweries: (query: string, locale: string) => Promise<BreweryOption[]>;
  onResult: (suggestion: SuggestionRow, result: DecisionResult, edited: boolean) => void;
}) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [failed, setFailed] = useState(false);
  const approve = useApproveSuggestion();
  const reject = useRejectSuggestion();
  const busy = approve.isPending || reject.isPending;

  // A plain promise chain, not `mutate`'s own callbacks: the refreshed queue unmounts this view as the decision lands.
  const decide = (run: () => Promise<DecisionResult>) => {
    setFailed(false);
    run()
      .then((result) => onResult(suggestion, result, false))
      .catch(() => setFailed(true));
  };

  const onApprove = () => decide(() => approve.mutateAsync({ id: suggestion.id }));
  const onReject = (reason: RejectionReason) => decide(() => reject.mutateAsync({ id: suggestion.id, reason }));

  if (editing) {
    return (
      <div className="flex flex-col gap-5">
        <SuggestionHeader suggestion={suggestion} locale={locale} />
        <EditSuggestionForm
          suggestion={suggestion}
          locale={locale}
          loadOptions={loadOptions}
          findBreweries={findBreweries}
          onResult={(result) => onResult(suggestion, result, true)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <SuggestionHeader suggestion={suggestion} locale={locale} />
      <dl>
        <Fact label={t("admin.review.fact.brewery")}>
          {suggestion.brewery.name}
          {suggestion.breweryIsNew && (
            <>
              {" "}
              <span className="inline-flex items-center rounded-control border border-border bg-accent px-2 py-0.5 text-label font-semibold uppercase text-accent-foreground">
                {t("admin.review.queue.newBrewery")}
              </span>
            </>
          )}
          <div className="text-sm text-muted-foreground">{suggestion.brewery.place}</div>
        </Fact>
        <Fact label={t("admin.review.fact.by")}>{suggestion.username ?? <span className="text-muted-foreground">{t("admin.review.queue.noUsername")}</span>}</Fact>
        <Fact label={t("admin.review.fact.record")}>
          {t("admin.review.fact.pending", { n: suggestion.pendingCount })} ·{" "}
          {t("admin.review.fact.rejected", { n: suggestion.rejectedCount })}
        </Fact>
        <Fact label={t("admin.review.fact.suggested")}>{suggestion.waited}</Fact>
      </dl>
      {failed && <ErrorAlert>{t("admin.review.failed")}</ErrorAlert>}
      <div className="flex flex-wrap gap-2 [&>*]:flex-1 [&>*]:basis-36">
        <Button type="button" pending={approve.isPending} disabled={busy} onClick={onApprove}>
          {suggestion.breweryIsNew ? t("admin.review.action.approveBoth") : t("admin.review.action.approve")}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
          {t("admin.review.action.edit")}
        </Button>
        <RejectDialog suggestion={suggestion} hasPendingSibling={hasPendingSibling} disabled={busy} onReject={onReject} />
      </div>
    </div>
  );
};

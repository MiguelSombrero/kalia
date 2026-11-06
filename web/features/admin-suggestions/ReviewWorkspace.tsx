"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Toast, ToastDescription, ToastProvider, ToastViewport } from "@/components/ui/toast";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { OutcomePanel } from "./OutcomePanel";
import { QueueList } from "./QueueList";
import { SuggestionView } from "./SuggestionView";
import type { BreweryOption, DecisionResult, EditOptions, Outcome, QueuePage, SuggestionRow } from "./types";

export const ReviewWorkspace = ({
  locale,
  queue,
  pager,
  loadOptions,
  findBreweries,
}: {
  locale: Locale;
  queue: QueuePage;
  /** The page links, rendered on the server. */
  pager: React.ReactNode;
  loadOptions: (locale: string) => Promise<EditOptions>;
  findBreweries: (query: string, locale: string) => Promise<BreweryOption[]>;
}) => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Below the large breakpoint the list and the suggestion take turns.
  const [detailOpen, setDetailOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selected = queue.rows.find((row) => row.id === selectedId) ?? queue.rows[0];

  const onResult = (suggestion: SuggestionRow, result: DecisionResult, edited: boolean) => {
    if (result.kind === "decided") {
      setOutcome({ kind: "decided", decision: result.decision, suggestion, edited });
      if (result.decision.outcome === "REJECTED") {
        setToast(t("admin.review.outcome.toastRejected", { beer: result.decision.name }));
      }
    } else if (result.kind === "alreadyDecided") {
      setOutcome({ kind: "alreadyDecided", suggestion, outcome: result.outcome, decidedAt: result.decidedAt });
    } else {
      setOutcome({ kind: "gone", suggestion });
    }
  };

  const onNext = () => {
    setOutcome(null);
    setSelectedId(null);
    setDetailOpen(queue.rows.length > 0 && detailOpen);
  };

  if (queue.rows.length === 0 && outcome === null) {
    return (
      <EmptyState title={t("admin.review.empty.title")} headingLevel={2} hint={t("admin.review.empty.body")} />
    );
  }

  const hasPendingSibling = (row: SuggestionRow) =>
    queue.rows.some((other) => other.id !== row.id && other.breweryIsNew && other.brewery.id === row.brewery.id);

  return (
    <ToastProvider swipeDirection="right">
      <div className="grid gap-8 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start">
        <div className={cn("flex flex-col gap-3", detailOpen && "hidden lg:flex")}>
          <p className="text-muted-foreground">{t("admin.review.subtitle", { n: queue.totalElements })}</p>
          <QueueList
            rows={queue.rows}
            selectedId={outcome ? undefined : selected?.id}
            detailOpen={detailOpen}
            onSelect={(id) => {
              setOutcome(null);
              setSelectedId(id);
              setDetailOpen(true);
            }}
          />
          {pager}
        </div>
        <section className={cn("flex flex-col gap-4 border border-border p-4 md:p-6", !detailOpen && "hidden lg:flex")}>
          <Button type="button" variant="outline" className="self-start lg:hidden" onClick={() => setDetailOpen(false)}>
            {t("admin.review.queue.back")}
          </Button>
          {outcome ? (
            <OutcomePanel outcome={outcome} locale={locale} hasNext={queue.rows.length > 0} onNext={onNext} />
          ) : (
            selected && (
              <SuggestionView
                key={selected.id}
                suggestion={selected}
                locale={locale}
                hasPendingSibling={hasPendingSibling(selected)}
                loadOptions={loadOptions}
                findBreweries={findBreweries}
                onResult={onResult}
              />
            )
          )}
        </section>
      </div>
      <Toast variant="success" open={toast !== null} onOpenChange={(open) => !open && setToast(null)}>
        <ToastDescription className="flex-1 text-sm text-foreground">{toast}</ToastDescription>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
};

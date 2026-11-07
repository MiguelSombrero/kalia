"use client";

import Link from "next/link";
import { enumLookup, UNKNOWN_VALUE_LABEL_KEY } from "@kalia/api";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Icon } from "@/components/ui/icon";
import { RelativeTime } from "@/components/ui/relative-time";
import type { Locale } from "@/i18n/settings";
import { beerHref } from "@/lib/routes";
import type { Notification, RejectionReason } from "./types";

const reasonLabelKey = enumLookup<RejectionReason, string>(
  {
    ALREADY_IN_CATALOG: "notifications.reason.ALREADY_IN_CATALOG",
    NOT_A_REAL_BEER: "notifications.reason.NOT_A_REAL_BEER",
    INAPPROPRIATE: "notifications.reason.INAPPROPRIATE",
    INCORRECT_DETAILS: "notifications.reason.INCORRECT_DETAILS",
  },
  UNKNOWN_VALUE_LABEL_KEY,
);

const NAME_SLOT = "\u0001";

const OutcomeCell = ({ approved }: { approved: boolean }) =>
  approved ? (
    <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center bg-success text-success-foreground">
      <Icon name="check" className="size-3.5" strokeWidth={3.5} />
    </span>
  ) : (
    <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center border border-border">
      <span className="h-0.5 w-2.5 bg-foreground" />
    </span>
  );

type Props = {
  notification: Notification;
  locale: Locale;
  now: Date;
  acknowledging: boolean;
  failed: boolean;
  onAcknowledge: (id: string) => void;
};

export const NotificationItem = ({ notification, locale, now, acknowledging, failed, onAcknowledge }: Props) => {
  const { t } = useTranslation();
  const approved = notification.outcome === "APPROVED";
  const renamed = notification.edited && notification.suggestedName !== undefined && notification.suggestedName !== notification.beerName;
  const sentenceKey = !approved
    ? "notifications.sentence.rejected"
    : renamed
      ? "notifications.sentence.editedRenamed"
      : notification.edited
        ? "notifications.sentence.editedSameName"
        : "notifications.sentence.approved";
  // The name goes between the two halves of its sentence as an element, never as markup inside the translated string.
  const parts = t(sentenceKey, { name: NAME_SLOT }).split(NAME_SLOT);

  return (
    <li className="flex flex-col gap-2 border-b border-divider px-4 py-3.5 last:border-b-0">
      <div className="flex items-center gap-2">
        <OutcomeCell approved={approved} />
        <span className="text-label font-semibold uppercase">
          {t(approved ? "notifications.outcome.approved" : "notifications.outcome.rejected")}
        </span>
        {notification.edited && <Badge variant="accent">{t("notifications.edited")}</Badge>}
        <span className="ml-auto text-xs whitespace-nowrap text-muted-foreground">
          <RelativeTime instant={notification.decidedAt} locale={locale} now={now} />
        </span>
      </div>
      <p className="text-sm text-foreground">
        {parts[0]}
        {parts.length > 1 && <strong className="font-semibold wrap-anywhere">{notification.beerName}</strong>}
        {parts[1]}
      </p>
      {renamed && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-surface-sunken px-2.5 py-2 text-sm">
          <span className="sr-only">
            {t("notifications.pair.suggested", { name: notification.suggestedName })}{" "}
            {t("notifications.pair.decided", { name: notification.beerName })}
          </span>
          <s aria-hidden="true" className="text-muted-foreground wrap-anywhere">
            {notification.suggestedName}
          </s>
          <Icon name="arrow" aria-hidden="true" className="size-4" />
          <strong aria-hidden="true" className="font-semibold wrap-anywhere">
            {notification.beerName}
          </strong>
        </p>
      )}
      {notification.reason && (
        <p className="text-sm">
          <span className="text-label font-semibold uppercase text-muted-foreground">{t("notifications.reasonLabel")}</span>{" "}
          {t(reasonLabelKey(notification.reason))}
        </p>
      )}
      {failed && <ErrorAlert>{t("notifications.error.acknowledge")}</ErrorAlert>}
      <div className="flex flex-wrap gap-2">
        {approved && (
          <Link href={beerHref(locale, notification.beerId)} className={buttonVariants("outline", "compact")}>
            {t("notifications.viewBeer")}
          </Link>
        )}
        <Button variant="outline" size="compact" pending={acknowledging} onClick={() => onAcknowledge(notification.id)}>
          {t("notifications.acknowledge")}
          <span className="sr-only">{`, ${notification.beerName}`}</span>
        </Button>
      </div>
    </li>
  );
};

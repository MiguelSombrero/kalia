"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/settings";
import { useAcknowledgeNotification, useNotificationList, useUnreadCount } from "./hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";

type Props = { locale: Locale; count: number };

export const NotificationsTray = ({ locale, count }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const unread = useUnreadCount(count);
  const list = useNotificationList(open);
  const acknowledge = useAcknowledgeNotification();
  const pathname = usePathname();
  const firstRender = useRef(true);
  const { refetch: refetchUnread } = unread;

  // web/README.md: the layout holding the header is not rendered again on navigation.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    void refetchUnread();
  }, [pathname, refetchUnread]);

  const unreadNow = open && list.data ? list.data.totalElements : unread.data;
  if (unreadNow === 0 && !open) return null;

  const items = list.data?.content ?? [];
  const failedId = acknowledge.isError ? acknowledge.variables?.id : undefined;
  const pendingId = acknowledge.isPending ? acknowledge.variables?.id : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setNow(new Date());
        setOpen(next);
      }}
    >
      <DialogTrigger
        className="mr-1 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 text-foreground lg:mr-3"
        data-testid="unread-signal"
      >
        <span
          aria-hidden="true"
          className="flex h-9 items-center gap-2 bg-foreground px-2.5 text-background lg:hidden"
        >
          <Icon name="mail" />
          <span className="text-sm font-bold tabular-nums">{unreadNow}</span>
        </span>
        <span aria-hidden="true" className="hidden items-center gap-2 lg:flex">
          <span className="text-label font-bold uppercase">{t("notifications.label")}</span>
          <span className="inline-flex h-5.5 min-w-5.5 items-center justify-center bg-foreground px-1.5 text-xs font-bold text-background tabular-nums">
            {unreadNow}
          </span>
        </span>
        <span className="sr-only">{t("notifications.unread", { count: unreadNow })}</span>
      </DialogTrigger>
      <DialogContent placement="bar" className="p-0">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface py-1.5 pr-2 pl-4">
          <DialogTitle look="label">{t("notifications.label")}</DialogTitle>
          <DialogClose aria-label={t("notifications.close")} className="inline-flex min-h-11 min-w-11 items-center justify-center">
            <Icon name="close" strokeWidth={2.5} className="size-4" />
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">{t("notifications.hint")}</DialogDescription>
        {list.isPending ? (
          <div role="status" aria-label={t("notifications.loading")} className="flex flex-col gap-3 px-4 py-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-1/3" />
          </div>
        ) : list.isError ? (
          <div className="p-4">
            <ErrorAlert
              action={
                <Button variant="outline" size="compact" onClick={() => void list.refetch()}>
                  {t("notifications.retry")}
                </Button>
              }
            >
              {t("notifications.error.load")}
            </ErrorAlert>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-7">
            <p className="font-semibold text-foreground">{t("notifications.empty.title")}</p>
            <p className="text-sm text-muted-foreground">{t("notifications.empty.hint")}</p>
          </div>
        ) : (
          <ul>
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                locale={locale}
                now={now}
                acknowledging={pendingId === notification.id}
                failed={failedId === notification.id}
                onAcknowledge={(id) => acknowledge.mutate({ id })}
              />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};

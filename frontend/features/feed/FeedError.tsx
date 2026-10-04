"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const FeedError = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [isRetrying, startRetry] = useTransition();

  return (
    <div role="alert" className="mt-4 flex border border-border bg-surface">
      <div className="flex w-12 shrink-0 items-center justify-center bg-destructive text-destructive-foreground">
        <Icon name="close" strokeWidth={2.5} />
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <p className="text-foreground">{t("feed.error.message")}</p>
        <Button
          type="button"
          variant="outline"
          disabled={isRetrying}
          onClick={() => startRetry(() => router.refresh())}
        >
          {t("feed.error.retry")}
        </Button>
      </div>
    </div>
  );
};

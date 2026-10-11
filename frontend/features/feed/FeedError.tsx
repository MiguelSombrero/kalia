"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";

export const FeedError = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [isRetrying, startRetry] = useTransition();

  return (
    <ErrorAlert
      className="mt-4"
      action={
        <Button
          type="button"
          variant="outline"
          disabled={isRetrying}
          onClick={() => startRetry(() => router.refresh())}
        >
          {t("feed.error.retry")}
        </Button>
      }
    >
      {t("feed.error.message")}
    </ErrorAlert>
  );
};

"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

const ErrorPage = ({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    logger.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        {t("error.title")}
      </h1>
      <p className="text-muted-foreground">{t("error.message")}</p>
      <Button variant="primary" className="mt-4" onClick={unstable_retry}>
        {t("error.retry")}
      </Button>
    </main>
  );
};

export default ErrorPage;

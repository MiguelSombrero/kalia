"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { Page } from "@/components/ui/page";

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
    <Page width="narrow">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        {t("error.title")}
      </h1>
      <p className="text-muted-foreground">{t("error.message")}</p>
      <Button variant="primary" className="self-start" onClick={unstable_retry}>
        {t("error.retry")}
      </Button>
    </Page>
  );
};

export default ErrorPage;

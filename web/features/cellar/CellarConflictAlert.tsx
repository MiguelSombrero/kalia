"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";

export const CellarConflictAlert = () => {
  const { t } = useTranslation();
  return (
    <ErrorAlert
      action={
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          {t("cellar.conflict.reload")}
        </Button>
      }
    >
      {t("cellar.conflict.message")}
    </ErrorAlert>
  );
};

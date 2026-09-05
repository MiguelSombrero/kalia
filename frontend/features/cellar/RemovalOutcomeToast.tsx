"use client";

import { useTranslation } from "react-i18next";
import { Toast, ToastDescription, ToastProvider, ToastViewport } from "@/components/ui/toast";
import { useBottleRemovalStore } from "./store";

/**
 * Mounted once per cellar page (in CellarList). Reacts to the shared removal
 * store rather than owning any bottle-specific state itself, since one toast
 * at a time means the toast's content follows whichever removal most
 * recently settled, wherever in the page it was started.
 */
export const RemovalOutcomeToast = () => {
  const { t } = useTranslation();
  const outcome = useBottleRemovalStore((state) => state.outcome);
  const dismissOutcome = useBottleRemovalStore((state) => state.dismissOutcome);

  const message =
    outcome && "failed" in outcome
      ? t("cellar.bottle.remove.error")
      : outcome?.lastBottle
        ? t("cellar.bottle.remove.toastLastBottle")
        : t("cellar.bottle.remove.toast");

  return (
    <ToastProvider swipeDirection="right">
      <Toast
        open={outcome !== null}
        onOpenChange={(open) => {
          if (!open) dismissOutcome();
        }}
      >
        <ToastDescription className="flex-1 text-sm text-foreground">{message}</ToastDescription>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
};

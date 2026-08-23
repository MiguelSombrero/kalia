"use client";

import { useTranslation } from "react-i18next";
import { Toast, ToastAction, ToastDescription, ToastProvider, ToastViewport } from "@/components/ui/toast";
import { useBottleRemovalStore } from "./store";

/**
 * Mounted once per cellar page (in CellarList). Reacts to the shared removal
 * store rather than owning any bottle-specific state itself, since one toast
 * at a time means the toast's content follows whichever removal is
 * currently pending, wherever in the page it was started.
 */
export const UndoRemoveToast = () => {
  const { t } = useTranslation();
  const pending = useBottleRemovalStore((state) => state.pending);
  const undoRemoval = useBottleRemovalStore((state) => state.undoRemoval);

  return (
    <ToastProvider swipeDirection="right">
      {/* duration=Infinity: the store's own timer decides when the removal
          finalizes, so Radix's built-in auto-dismiss must not race it.
          onOpenChange only fires from a swipe-dismiss (there is no close
          button), and dismissing the toast that way means the same thing
          as Undo — otherwise the removal would keep counting down with no
          visible countdown left to cancel it. */}
      <Toast
        open={pending !== null}
        duration={Infinity}
        onOpenChange={(open) => {
          if (!open) undoRemoval();
        }}
      >
        <ToastDescription className="flex-1 text-sm text-foreground">
          {t("cellar.bottle.remove.toast")}
        </ToastDescription>
        <ToastAction altText={t("cellar.bottle.remove.undo")} onClick={undoRemoval}>
          {t("cellar.bottle.remove.undo")}
        </ToastAction>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
};

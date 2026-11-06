"use client";

import { useTranslation } from "react-i18next";
import { Toast, ToastDescription, ToastProvider, ToastViewport } from "@/components/ui/toast";
import { useBeerRemovedStore, useJustAddedStore } from "./store";

/**
 * Mounted once per catalog page, outside the list the dialog that added the beer
 * lived in. One provider holds both toasts so the page has one notifications region.
 */
export const CatalogToasts = ({ announceRemoval = false }: { announceRemoval?: boolean }) => {
  const { t } = useTranslation();
  const addedBeer = useJustAddedStore((state) => state.beer);
  const addedOpen = useJustAddedStore((state) => state.toastOpen);
  const dismissAdded = useJustAddedStore((state) => state.dismissToast);
  const removedBeer = useBeerRemovedStore((state) => state.beer);
  const dismissRemoved = useBeerRemovedStore((state) => state.dismiss);

  return (
    <ToastProvider swipeDirection="right">
      <Toast variant="success" open={addedOpen && addedBeer !== null} onOpenChange={(next) => !next && dismissAdded()}>
        <ToastDescription className="flex-1 text-sm text-foreground">
          {addedBeer && t("catalog.add.added", { beer: addedBeer.name })}
        </ToastDescription>
      </Toast>
      {announceRemoval && (
        <Toast variant="success" open={removedBeer !== null} onOpenChange={(next) => !next && dismissRemoved()}>
          <ToastDescription className="flex-1 text-sm text-foreground">
            {removedBeer && t("beer.remove.notice", { beer: removedBeer.name })}
          </ToastDescription>
        </Toast>
      )}
      <ToastViewport />
    </ToastProvider>
  );
};

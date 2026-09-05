"use client";

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRemoveBottle } from "./hooks/useBottles";
import { useBottleRemovalStore } from "./store";
import type { Bottle } from "./types";

export const RemoveBottleDialog = ({
  bottle,
  entryId,
  beerName,
  lastBottle,
}: {
  bottle: Bottle;
  entryId: string;
  beerName: string;
  lastBottle: boolean;
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const removeBottle = useRemoveBottle();
  const startRemoving = useBottleRemovalStore((state) => state.startRemoving);
  const finishRemoving = useBottleRemovalStore((state) => state.finishRemoving);
  const ids = useId();

  const onConfirm = () => {
    const removal = { bottleId: bottle.id, entryId };
    setIsOpen(false);
    startRemoving(removal);
    // A plain promise chain, not `mutate`'s own onSuccess/onError options:
    // those are dropped if this component unmounts before the request
    // settles, which `startRemoving` above makes happen immediately (it
    // hides this row, and BottleList stops rendering it). The chain here
    // runs regardless, since it isn't tied to this component's lifecycle.
    removeBottle
      .mutateAsync({ id: bottle.id, entryId })
      .then(() => finishRemoving(removal, { lastBottle }))
      .catch(() => finishRemoving(removal, { failed: true }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className={buttonVariants("outline")}>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
        >
          <path
            d="M4 6h12M8 6V4h4v2m-7 0 .8 10.2A1 1 0 0 0 6.8 17h6.4a1 1 0 0 0 1-.8L15 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t("cellar.bottle.remove.action")}
      </DialogTrigger>
      <DialogContent aria-describedby={`${ids}-description`}>
        <DialogTitle>{t("cellar.bottle.remove.confirmTitle")}</DialogTitle>
        <DialogDescription id={`${ids}-description`}>
          {t("cellar.bottle.remove.confirmDescription", { beer: beerName })}
        </DialogDescription>
        <div className="mt-4 flex justify-end gap-2">
          <DialogClose className={buttonVariants("outline")}>
            {t("cellar.bottle.remove.cancel")}
          </DialogClose>
          <Button type="button" variant="primary" onClick={onConfirm}>
            {t("cellar.bottle.remove.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

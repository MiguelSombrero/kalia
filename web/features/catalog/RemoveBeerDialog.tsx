"use client";

import { isApiError } from "@kalia/api";
import { useRouter } from "next/navigation";
import { useId } from "react";
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
import { ErrorAlert } from "@/components/ui/error-alert";
import type { Locale } from "@/i18n/settings";
import { useRemoveBeer } from "./hooks/useRemoveBeer";
import { catalogHref } from "./links";
import { useBeerRemovedStore } from "./store";

const REFUSAL_MESSAGES: Record<number, string> = {
  403: "beer.remove.error.forbidden",
  404: "beer.remove.error.notFound",
  409: "beer.remove.error.notApproved",
};

const messageKey = (error: unknown): string => {
  const refusal = isApiError(error) && error.kind === "http" && error.status ? REFUSAL_MESSAGES[error.status] : undefined;
  return refusal ?? "beer.remove.error.failed";
};

export const RemoveBeerDialog = ({
  locale,
  beerId,
  beerName,
}: {
  locale: Locale;
  beerId: string;
  beerName: string;
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const ids = useId();
  const removal = useRemoveBeer();
  const announce = useBeerRemovedStore((state) => state.announce);

  const onConfirm = () => {
    removal.mutate(
      { id: beerId },
      {
        onSuccess: () => {
          announce({ name: beerName });
          router.push(catalogHref(locale));
        },
      },
    );
  };

  return (
    <Dialog onOpenChange={() => removal.reset()}>
      <DialogTrigger className={buttonVariants("outline")}>{t("beer.remove.action")}</DialogTrigger>
      <DialogContent role="alertdialog" aria-describedby={`${ids}-description`}>
        <DialogTitle>{t("beer.remove.title")}</DialogTitle>
        <DialogDescription id={`${ids}-description`}>{t("beer.remove.description", { beer: beerName })}</DialogDescription>
        {removal.isError && <ErrorAlert className="mt-4">{t(messageKey(removal.error))}</ErrorAlert>}
        <div className="mt-4 flex justify-end gap-2">
          <DialogClose className={buttonVariants("outline")}>{t("beer.remove.cancel")}</DialogClose>
          <Button
            type="button"
            variant="destructive"
            pending={removal.isPending || removal.isSuccess}
            onClick={onConfirm}
          >
            {removal.isPending || removal.isSuccess ? t("beer.remove.confirming") : t("beer.remove.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

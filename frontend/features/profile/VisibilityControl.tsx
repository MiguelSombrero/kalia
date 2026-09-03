"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Toast, ToastDescription, ToastProvider, ToastViewport } from "@/components/ui/toast";
import { useChangeVisibility } from "./hooks/useProfile";

type Props = { username: string; initialCellarPublic: boolean };

export const VisibilityControl = ({ username, initialCellarPublic }: Props) => {
  const { t } = useTranslation();
  const ids = useId();
  const [cellarPublic, setCellarPublic] = useState(initialCellarPublic);
  const [showError, setShowError] = useState(false);
  const changeVisibility = useChangeVisibility();

  const setVisibility = (next: boolean) => {
    if (next === cellarPublic) return;
    const previous = cellarPublic;
    setCellarPublic(next);
    setShowError(false);
    changeVisibility.mutate(next, {
      onError: () => {
        // Rolls the displayed state back to what the server still has —
        // an optimistic toggle that silently keeps the failed value would
        // tell the user their cellar is public when it is not.
        setCellarPublic(previous);
        setShowError(true);
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">
          {t("profile.visibility.legend")}
        </legend>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name={`${ids}-visibility`}
            checked={!cellarPublic}
            onChange={() => setVisibility(false)}
          />
          {t("profile.visibility.private")}
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name={`${ids}-visibility`}
            checked={cellarPublic}
            onChange={() => setVisibility(true)}
          />
          {t("profile.visibility.public")}
        </label>
      </fieldset>

      <p className="text-sm text-muted-foreground">
        {cellarPublic ? t("profile.visibility.statePublic") : t("profile.visibility.statePrivate")}
      </p>

      {/* Only while public: a private cellar 404s for its owner too
          (ADR-0050), so offering the link while private would link to a
          not-found page. */}
      {cellarPublic && (
        <Link
          href={`/cellars/${username}`}
          className="text-sm text-foreground underline underline-offset-2"
        >
          {t("profile.visibility.viewLink")}
        </Link>
      )}

      <ToastProvider swipeDirection="right">
        <Toast open={showError} duration={5000} onOpenChange={(open) => !open && setShowError(false)}>
          <ToastDescription className="flex-1 text-sm text-foreground">
            {t("profile.visibility.error")}
          </ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    </div>
  );
};

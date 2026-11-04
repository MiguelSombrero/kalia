"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import type { Locale } from "@/i18n/settings";
import { beerHref } from "./links";
import type { AddBeerOutcome, BreweryOption } from "./types";

type Props = {
  locale: Locale;
  outcome: AddBeerOutcome | undefined;
  failed: boolean;
  refusalMarked: boolean;
  onUseBrewery: (brewery: BreweryOption) => void;
};

export const AddBeerOutcomeAlert = ({ locale, outcome, failed, refusalMarked, onUseBrewery }: Props) => {
  const { t } = useTranslation();

  if (failed) return <ErrorAlert>{t("catalog.add.failed")}</ErrorAlert>;

  switch (outcome?.kind) {
    case "duplicateBeer":
      return (
        <ErrorAlert
          action={
            <Link
              href={beerHref(locale, outcome.existing.id)}
              className="text-sm font-semibold text-foreground underline underline-offset-2 hover:text-primary"
            >
              {t("catalog.add.duplicateOpen", { beer: outcome.existing.name })}
            </Link>
          }
        >
          <span className="font-semibold">
            {outcome.existing.breweryName
              ? t("catalog.add.duplicateBeer", { beer: outcome.existing.name, brewery: outcome.existing.breweryName })
              : t("catalog.add.duplicateBeerNoBrewery", { beer: outcome.existing.name })}
          </span>{" "}
          <span className="text-muted-foreground">{t("catalog.add.duplicateHint")}</span>
        </ErrorAlert>
      );
    case "duplicateBrewery":
      return (
        <ErrorAlert
          action={
            <Button type="button" variant="outline" onClick={() => onUseBrewery(outcome.existing)}>
              {t("catalog.add.useBrewery")}
            </Button>
          }
        >
          <span className="font-semibold">
            {t("catalog.add.duplicateBrewery", { brewery: outcome.existing.name, place: outcome.existing.place })}
          </span>
        </ErrorAlert>
      );
    case "pendingElsewhere":
      return <ErrorAlert>{t("catalog.add.pendingElsewhere")}</ErrorAlert>;
    case "pendingCap":
      return <ErrorAlert>{t("catalog.add.pendingCap")}</ErrorAlert>;
    case "refused":
      return <ErrorAlert>{t(refusalMarked ? "catalog.add.refused" : "catalog.add.refusedUnmarked")}</ErrorAlert>;
    default:
      return null;
  }
};

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { startCatalogSignIn } from "./actions";
import { AddBeerDialog } from "./AddBeerDialog";

const SignInForm = ({ locale, query, children }: { locale: Locale; query?: string; children: ReactNode }) => (
  <form action={startCatalogSignIn} className="contents">
    <input type="hidden" name="locale" value={locale} />
    {query && <input type="hidden" name="query" value={query} />}
    {children}
  </form>
);

/**
 * The way from a search to the add-a-beer form (ADR-0082): `empty` under a
 * search that found nothing, `line` under one whose beers were not it.
 * Signed out, both invite signing in instead.
 */
export const AddBeerEntry = async ({
  locale,
  query,
  isSignedIn,
  placement,
}: {
  locale: Locale;
  query?: string;
  isSignedIn: boolean;
  placement: "empty" | "line";
}) => {
  const { t } = await getTranslation(locale);

  if (placement === "line") {
    return (
      <div className="border-t border-divider pt-3 text-sm text-foreground">
        {t("catalog.add.notHere")}{" "}
        {isSignedIn ? (
          <AddBeerDialog locale={locale} initialName={query} trigger="link" />
        ) : (
          <SignInForm locale={locale} query={query}>
            <button
              type="submit"
              className="font-semibold text-foreground underline underline-offset-2 hover:text-primary"
            >
              {t("catalog.add.signInToAdd")}
            </button>
          </SignInForm>
        )}
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-foreground">{t("catalog.add.emptyLead")}</p>
        <AddBeerDialog locale={locale} initialName={query} trigger="button" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <div>
        <p className="font-semibold text-foreground">{t("catalog.add.signedOutLead")}</p>
        <p className="text-muted-foreground">{t("catalog.add.signedOutHint")}</p>
      </div>
      <SignInForm locale={locale} query={query}>
        <Button type="submit" variant="primary">
          {t("catalog.add.signIn")}
        </Button>
      </SignInForm>
    </div>
  );
};

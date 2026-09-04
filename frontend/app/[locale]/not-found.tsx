import Link from "next/link";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";
import { getTranslation } from "@/i18n/server";

// The generic not-found for the [locale] subtree: a `notFound()` with no
// closer boundary lands here. It says nothing about what was missing — a
// public cellar that is not public renders this exact page (ADR-0050).
const LocaleNotFound = async () => {
  const locale = await resolveLocaleFromHeaders();
  const { t } = await getTranslation(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        {t("notFound.generic.title")}
      </h1>
      <p className="text-muted-foreground">{t("notFound.generic.message")}</p>
      <Link
        href={`/${locale}`}
        className="mt-4 font-medium text-foreground underline underline-offset-2"
      >
        {t("notFound.generic.backLink")}
      </Link>
    </main>
  );
};

export default LocaleNotFound;

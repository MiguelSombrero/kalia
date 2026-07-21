import { headers } from "next/headers";
import Link from "next/link";
import { getTranslation } from "@/i18n/server";
import { defaultLocale, isLocale, type Locale } from "@/i18n/settings";

/**
 * not-found.tsx receives no props (Next.js convention) — the locale is
 * recovered from the x-pathname header proxy.ts sets on every request.
 */
const BeerNotFound = async () => {
  const requestHeaders = await headers();
  const pathnameLocale = requestHeaders.get("x-pathname")?.split("/")[1] ?? "";
  const locale: Locale = isLocale(pathnameLocale) ? pathnameLocale : defaultLocale;
  const { t } = await getTranslation(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{t("notFound.title")}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{t("notFound.message")}</p>
      <Link href={`/${locale}/beers`} className="mt-4 font-medium underline underline-offset-2">
        {t("notFound.backLink")}
      </Link>
    </main>
  );
};

export default BeerNotFound;

import { headers } from "next/headers";
import { BeerListSkeleton } from "@/features/catalog/BeerListSkeleton";
import { defaultLocale, isLocale, type Locale } from "@/i18n/settings";

/**
 * loading.tsx receives no props (Next.js convention) — the locale is
 * recovered from the x-pathname header proxy.ts sets on every request,
 * same mechanism not-found.tsx uses.
 */
const BeersLoading = async () => {
  const requestHeaders = await headers();
  const pathnameLocale = requestHeaders.get("x-pathname")?.split("/")[1] ?? "";
  const locale: Locale = isLocale(pathnameLocale) ? pathnameLocale : defaultLocale;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <BeerListSkeleton locale={locale} />
    </main>
  );
};

export default BeersLoading;

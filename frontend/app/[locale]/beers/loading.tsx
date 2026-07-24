import { BeerListSkeleton } from "@/features/catalog/BeerListSkeleton";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";

/**
 * loading.tsx receives no props (Next.js convention) — the locale is
 * recovered from the x-pathname header proxy.ts sets on every request,
 * same mechanism not-found.tsx uses.
 */
const BeersLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <BeerListSkeleton locale={locale} />
    </main>
  );
};

export default BeersLoading;

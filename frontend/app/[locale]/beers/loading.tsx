import { BeerListSkeleton } from "@/features/catalog/BeerListSkeleton";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";

const BeersLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <BeerListSkeleton locale={locale} />
    </main>
  );
};

export default BeersLoading;

import { BeerDetailsSkeleton } from "@/features/catalog/BeerDetailsSkeleton";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";

const BeerLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <BeerDetailsSkeleton locale={locale} />
    </main>
  );
};

export default BeerLoading;

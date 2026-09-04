import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";
import { PublicCellarSkeleton } from "./PublicCellarSkeleton";

const PublicCellarLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <PublicCellarSkeleton locale={locale} />
    </main>
  );
};

export default PublicCellarLoading;

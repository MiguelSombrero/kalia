import { CellarListSkeleton } from "./CellarListSkeleton";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";

const CellarLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <CellarListSkeleton locale={locale} />
    </main>
  );
};

export default CellarLoading;

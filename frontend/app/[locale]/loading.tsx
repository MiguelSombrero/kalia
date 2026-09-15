import { FeedSkeleton } from "./FeedSkeleton";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";

const HomeLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <FeedSkeleton locale={locale} />
    </main>
  );
};

export default HomeLoading;

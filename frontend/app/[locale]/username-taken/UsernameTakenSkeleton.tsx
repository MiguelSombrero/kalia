import { Skeleton } from "@/components/ui/skeleton";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";

export const UsernameTakenSkeleton = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <div role="status" aria-label={t("profile.loading")} className="flex flex-col gap-4">
      <Skeleton className="h-8 w-64 md:h-12 md:w-96" />
      <Skeleton className="h-16 w-full max-w-prose" />
      <Skeleton className="h-6 w-full max-w-md" />
      <Skeleton className="h-11 w-28" />
    </div>
  );
};

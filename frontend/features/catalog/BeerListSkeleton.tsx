import { Skeleton } from "@/components/ui/skeleton";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";

export const BeerListSkeleton = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <div role="status" aria-label={t("catalog.loading")} className="flex flex-col gap-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Skeleton className="h-16 lg:col-span-2" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    </div>
  );
};

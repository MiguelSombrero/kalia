import { Skeleton } from "@/components/ui/skeleton";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";

export const PublicCellarSkeleton = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <div role="status" aria-label={t("cellar.public.loading")} className="flex flex-col gap-6">
      <Skeleton className="h-9 w-64" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14" />
        ))}
      </div>
    </div>
  );
};

import { Skeleton } from "@/components/ui/skeleton";
import { cellarHead } from "@/features/cellar";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { CellarBeersSkeleton } from "./CellarBeersSkeleton";

export const CellarListSkeleton = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <div role="status" aria-label={t("cellar.loading")} className="flex flex-col gap-6 md:gap-8">
      <div className={cellarHead}>
        <Skeleton className="h-8 w-48 md:h-12 md:w-72" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-6 w-full max-w-md" />
      </div>
      <CellarBeersSkeleton withFindBeers />
    </div>
  );
};

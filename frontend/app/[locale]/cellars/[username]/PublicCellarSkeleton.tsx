import { Skeleton } from "@/components/ui/skeleton";
import { cellarHead } from "@/features/cellar";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { CellarBeersSkeleton } from "../../cellar/CellarBeersSkeleton";

export const PublicCellarSkeleton = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <div role="status" aria-label={t("cellar.public.loading")} className="flex flex-col gap-6 md:gap-8">
      <div className="flex items-start gap-4">
        <Skeleton className="size-12 shrink-0" />
        <div className={`${cellarHead} flex-1`}>
          <Skeleton className="h-16 w-full md:h-12 md:w-3/4" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      </div>
      <CellarBeersSkeleton withFindBeers={false} />
    </div>
  );
};

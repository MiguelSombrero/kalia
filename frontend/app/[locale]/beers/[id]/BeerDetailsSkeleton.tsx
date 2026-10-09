import { detailsHead, factRow } from "@/features/catalog";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";

export const BEER_DETAILS_SKELETON_FACTS = 4;

export const BeerDetailsSkeleton = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <div role="status" aria-label={t("catalog.loading")} className="flex flex-col gap-6 md:gap-8">
      <Skeleton className="h-10 w-44" />
      <div className="flex flex-col gap-8">
        <div className={detailsHead}>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-8 w-3/4 md:h-12" />
              <Skeleton className="h-7 w-2/3" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          <Skeleton className="aspect-[16/7] w-full" />
        </div>
        <div className="border-t border-divider">
          {Array.from({ length: BEER_DETAILS_SKELETON_FACTS }).map((_, index) => (
            <div key={index} className={factRow}>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-2/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

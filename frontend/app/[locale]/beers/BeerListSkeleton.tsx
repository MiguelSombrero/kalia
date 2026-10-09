import { beerRowFrame, beerRowSide, catalogColumns } from "@/features/catalog";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";

export const BEER_LIST_SKELETON_ROWS = 8;

const field = (
  <div className="flex flex-col gap-1">
    <Skeleton className="h-4 w-16" />
    <Skeleton className="h-10" />
  </div>
);

export const BeerListSkeleton = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <div role="status" aria-label={t("catalog.loading")} className="flex flex-col gap-6 md:gap-8">
      <Skeleton className="h-8 w-56 md:h-12" />
      <div className={catalogColumns}>
        <div className="flex flex-col gap-4">
          {field}
          <Skeleton className="h-12 md:hidden" />
          <div className="hidden flex-col gap-4 md:flex">
            {field}
            {field}
            {field}
            {field}
          </div>
          <Skeleton className="h-10" />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Skeleton className="h-6 w-24" />
          <ul className="border-t border-divider">
            {Array.from({ length: BEER_LIST_SKELETON_ROWS }).map((_, index) => (
              <li key={index} className={beerRowFrame}>
                <Skeleton className="row-span-2 w-1.5 self-stretch" />
                <Skeleton className="h-6 w-3/5" />
                <Skeleton className="col-start-2 h-4 w-2/5" />
                <div className={beerRowSide}>
                  <Skeleton className="h-6 w-14" />
                  <Skeleton className="h-8 w-14" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

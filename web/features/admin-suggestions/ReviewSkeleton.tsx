import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { Skeleton } from "@/components/ui/skeleton";

/** The queue's shape while it loads: the page's own loading state, since the admin route has no loading.tsx. */
export const ReviewSkeleton = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <div role="status" aria-label={t("admin.review.loadingLabel")} className="grid gap-8 lg:grid-cols-[21rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48" />
        <div className="border border-border">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2 border-t border-divider p-3 first:border-t-0">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          ))}
        </div>
      </div>
      <div className="hidden flex-col gap-4 border border-border p-6 lg:flex">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
};

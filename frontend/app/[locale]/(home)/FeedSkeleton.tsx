import { Skeleton } from "@/components/ui/skeleton";
import { feedRowFrame } from "@/features/feed";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { feedHeadingRow, mastheadGrid } from "./frontPageLayout";

export const FEED_SKELETON_ROWS = 6;

export const FeedSkeleton = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <div role="status" aria-label={t("feed.loading")} className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-6">
        <div className={mastheadGrid}>
          <div className="flex flex-col gap-0.5 md:gap-0">
            <Skeleton className="h-7.5 md:h-12" />
            <Skeleton className="h-7.5 md:h-12" />
            <Skeleton className="h-7.5 w-2/3 md:h-12" />
          </div>
          <Skeleton className="h-12" />
        </div>
        <Skeleton className="h-62.5 md:h-28" />
      </div>
      <div>
        <div className={feedHeadingRow}>
          <Skeleton className="h-4 w-36" />
        </div>
        <ul>
          {Array.from({ length: FEED_SKELETON_ROWS }).map((_, index) => (
            <li key={index} className={feedRowFrame}>
              <Skeleton className="size-9 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6.5 w-3/5 md:h-7.5" />
                <Skeleton className="h-5 w-2/5" />
              </div>
              <Skeleton className="h-12.5 w-11 self-center md:h-14" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

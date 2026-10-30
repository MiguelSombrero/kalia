import { Skeleton } from "@/components/ui/skeleton";
import { nameTag, nameTagSlot, visibilityTiles } from "@/features/profile";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";

export const ProfileViewSkeleton = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <div role="status" aria-label={t("profile.loading")} className="flex flex-col gap-6 md:gap-8">
      <div className={cn(nameTag, "border-divider")}>
        <Skeleton className={cn("size-24", nameTagSlot)} />
        <Skeleton className="h-4 w-36 self-end" />
        <Skeleton className="col-span-2 h-7 w-4/5 md:h-16" />
        <Skeleton className="col-span-2 h-5 w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-64" />
        <div className={visibilityTiles}>
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
};

import { Skeleton } from "@/components/ui/skeleton";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";

export const ProfileViewSkeleton = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <div role="status" aria-label={t("profile.loading")} className="flex flex-col gap-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
};

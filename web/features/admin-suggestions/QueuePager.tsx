import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { adminHref } from "@/lib/routes";
import { buttonVariants } from "@/components/ui/button";

// Plain anchors: query-only navigation does not commit through next/link in production builds (web/README.md).
export const QueuePager = async ({ locale, page, totalPages }: { locale: Locale; page: number; totalPages: number }) => {
  if (totalPages <= 1) return null;
  const { t } = await getTranslation(locale);
  const href = (target: number) => `${adminHref(locale)}?page=${target + 1}`;

  return (
    <nav aria-label={t("admin.review.queue.label")} className="flex flex-wrap items-center justify-between gap-3 pt-1">
      {page > 0 ? (
        <a href={href(page - 1)} className={buttonVariants("outline", "compact")}>
          {t("admin.review.queue.previous")}
        </a>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground">
        {t("admin.review.queue.summary", { page: page + 1, totalPages })}
      </span>
      {page < totalPages - 1 ? (
        <a href={href(page + 1)} className={buttonVariants("outline", "compact")}>
          {t("admin.review.queue.next")}
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
};

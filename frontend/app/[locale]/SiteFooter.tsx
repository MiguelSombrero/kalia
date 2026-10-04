import { KaliaMark } from "@/components/ui/kalia-mark";
import { shellFrame } from "@/components/ui/page";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";

export const SiteFooter = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <footer className="border-t border-divider">
      <div className={cn(shellFrame, "flex min-h-16 flex-wrap items-center gap-3 py-3")}>
        <KaliaMark className="size-5" />
        <p className="text-sm text-muted-foreground">{t("app.tagline")}</p>
      </div>
    </footer>
  );
};

import { KaliaMark } from "@/components/ui/kalia-mark";
import { shellFrame } from "@/components/ui/page";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { cn } from "@/lib/cn";

// The site, never an item page: an item page shows the beer's Untappd ID and link (ADR-0077).
const WIKIDATA_URL = "https://www.wikidata.org/";

export const SiteFooter = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <footer className="border-t border-divider">
      <div className={cn(shellFrame, "flex min-h-16 flex-wrap items-center gap-x-3 gap-y-1 py-3")}>
        <KaliaMark className="size-5" />
        <p className="text-sm text-muted-foreground">{t("app.tagline")}</p>
        <p className="text-sm text-muted-foreground">
          {t("app.dataCredit.before")}{" "}
          <a href={WIKIDATA_URL} className="inline-block py-1 underline underline-offset-2">
            {t("app.dataCredit.source")}
          </a>{" "}
          {t("app.dataCredit.after")}
        </p>
      </div>
    </footer>
  );
};

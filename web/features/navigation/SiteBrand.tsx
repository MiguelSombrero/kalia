import Link from "next/link";
import { KaliaMark } from "@/components/ui/kalia-mark";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";

export const SiteBrand = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <Link
      href={`/${locale}`}
      aria-label={`${t("app.name")}, ${t("nav.home")}`}
      className="inline-flex min-h-11 items-center gap-2.5 text-foreground"
    >
      <KaliaMark />
      <span aria-hidden="true" className="text-wordmark font-semibold uppercase">
        {t("app.name")}
      </span>
    </Link>
  );
};

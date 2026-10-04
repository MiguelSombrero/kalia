import Link from "next/link";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";
import { getTranslation } from "@/i18n/server";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/components/ui/button";
import { Page } from "@/components/ui/page";

const BeerNotFound = async () => {
  const locale = await resolveLocaleFromHeaders();
  const { t } = await getTranslation(locale);

  return (
    <Page width="narrow">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        {t("notFound.title")}
      </h1>
      <p className="text-muted-foreground">{t("notFound.message")}</p>
      <Link
        href={`/${locale}/beers`}
        className={cn(buttonVariants("outline"), "self-start")}
      >
        {t("notFound.backLink")}
      </Link>
    </Page>
  );
};

export default BeerNotFound;

import Link from "next/link";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";
import { getTranslation } from "@/i18n/server";
import { cn } from "@/lib/cn";
import { catalogHref } from "@/lib/routes";
import { buttonVariants } from "@/components/ui/button";
import { Page } from "@/components/ui/page";
import { PageTitle } from "@/components/ui/page-title";

const BeerNotFound = async () => {
  const locale = await resolveLocaleFromHeaders();
  const { t } = await getTranslation(locale);

  return (
    <Page width="narrow">
      <PageTitle>{t("notFound.title")}</PageTitle>
      <p className="text-muted-foreground">{t("notFound.message")}</p>
      <Link href={catalogHref(locale)} className={cn(buttonVariants("outline"), "self-start")}>
        {t("notFound.backLink")}
      </Link>
    </Page>
  );
};

export default BeerNotFound;

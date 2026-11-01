import Link from "next/link";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";
import { getTranslation } from "@/i18n/server";
import { cn } from "@/lib/cn";
import { homeHref } from "@/lib/routes";
import { buttonVariants } from "@/components/ui/button";
import { Page } from "@/components/ui/page";
import { PageTitle } from "@/components/ui/page-title";

// The generic not-found for the [locale] subtree: a `notFound()` with no
// closer boundary lands here. It says nothing about what was missing — a
// public cellar that is not public renders this exact page (ADR-0050).
const LocaleNotFound = async () => {
  const locale = await resolveLocaleFromHeaders();
  const { t } = await getTranslation(locale);

  return (
    <Page width="narrow">
      <PageTitle>{t("notFound.generic.title")}</PageTitle>
      <p className="text-muted-foreground">{t("notFound.generic.message")}</p>
      <Link
        href={homeHref(locale)}
        className={cn(buttonVariants("outline"), "self-start")}
      >
        {t("notFound.generic.backLink")}
      </Link>
    </Page>
  );
};

export default LocaleNotFound;

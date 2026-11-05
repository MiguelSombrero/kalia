import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/ui/page";
import { PageTitle } from "@/components/ui/page-title";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { currentUserIsAdmin } from "@/lib/auth/adminRole";

type Props = { params: Promise<{ locale: string }> };

// A non-admin's head carries the not-found title too, or it would say the area exists.
export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const locale = toLocale((await params).locale);
  const [{ t }, isAdmin] = await Promise.all([getTranslation(locale), currentUserIsAdmin()]);
  return {
    title: isAdmin
      ? t("admin.pageTitle")
      : `${t("notFound.generic.title")} — ${t("app.name")}`,
    robots: { index: false, follow: false },
  };
};

const AdminPage = async ({ params }: Props) => {
  const locale = toLocale((await params).locale);

  // Before anything of the page renders; signed out and non-admin alike (ADR-0101).
  if (!(await currentUserIsAdmin())) {
    notFound();
  }

  const { t } = await getTranslation(locale);

  return (
    <Page width="wide">
      <PageTitle>{t("admin.title")}</PageTitle>
      <p className="text-muted-foreground">{t("placeholder.comingSoon")}</p>
    </Page>
  );
};

export default AdminPage;

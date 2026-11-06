import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Page } from "@/components/ui/page";
import { PageTitle } from "@/components/ui/page-title";
import { findBreweriesAction, loadAddBeerOptionsAction } from "@/features/catalog";
import { ReviewQueue, ReviewSkeleton } from "@/features/admin-suggestions";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { currentUserIsAdmin } from "@/lib/auth/adminRole";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

// A non-admin's head carries the not-found title too, or it would say the area exists.
export const generateMetadata = async ({ params }: Pick<Props, "params">): Promise<Metadata> => {
  const locale = toLocale((await params).locale);
  const [{ t }, isAdmin] = await Promise.all([getTranslation(locale), currentUserIsAdmin()]);
  return {
    title: isAdmin
      ? t("admin.pageTitle")
      : `${t("notFound.generic.title")} — ${t("app.name")}`,
    robots: { index: false, follow: false },
  };
};

const queuePage = (raw: string | undefined): number => {
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page - 1 : 0;
};

const AdminPage = async ({ params, searchParams }: Props) => {
  const locale = toLocale((await params).locale);

  // Before anything of the page renders; signed out and non-admin alike (ADR-0101).
  if (!(await currentUserIsAdmin())) {
    notFound();
  }

  const [{ t }, { page }] = await Promise.all([getTranslation(locale), searchParams]);

  return (
    <Page width="wide">
      <PageTitle>{t("admin.review.title")}</PageTitle>
      <Suspense fallback={<ReviewSkeleton locale={locale} />}>
        <ReviewQueue
          locale={locale}
          page={queuePage(page)}
          loadOptions={loadAddBeerOptionsAction}
          findBreweries={findBreweriesAction}
        />
      </Suspense>
    </Page>
  );
};

export default AdminPage;

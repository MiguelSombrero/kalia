import type { Metadata } from "next";
import { auth } from "@/auth";
import { CellarView, cellarHead, listCellarEntries, SignInPrompt } from "@/features/cellar";
import { getOwnProfileOrNull } from "@/features/profile";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { Page } from "@/components/ui/page";
import { PageTitle } from "@/components/ui/page-title";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const locale = toLocale((await params).locale);
  const { t } = await getTranslation(locale);
  return { title: t("cellar.pageTitle") };
};

const CellarPage = async ({ params }: Props) => {
  const locale = toLocale((await params).locale);
  const session = await auth();
  const { t } = await getTranslation(locale);

  if (!session?.user) {
    return (
      <Page width="wide">
        <div className={cellarHead}>
          <PageTitle>{t("cellar.title")}</PageTitle>
        </div>
        <SignInPrompt locale={locale} />
      </Page>
    );
  }

  const [beers, profile] = await Promise.all([listCellarEntries(), getOwnProfileOrNull(locale)]);

  return (
    <Page width="wide">
      <CellarView
        locale={locale}
        beers={beers}
        visibility={profile && { username: profile.username, cellarPublic: profile.cellarPublic }}
      />
    </Page>
  );
};

export default CellarPage;

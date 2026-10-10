import type { Metadata } from "next";
import { auth } from "@/auth";
import { CellarView, cellarHead, cellarTitle, listCellarEntries, SignInPrompt } from "@/features/cellar";
import { getProfile } from "@/features/profile";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { Page } from "@/components/ui/page";

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
          <h1 className={cellarTitle}>{t("cellar.title")}</h1>
        </div>
        <SignInPrompt locale={locale} />
      </Page>
    );
  }

  const [beers, profile] = await Promise.all([listCellarEntries(), getProfile().catch(() => null)]);

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

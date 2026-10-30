import type { Metadata } from "next";
import { auth } from "@/auth";
import { cellarCounts, listCellarEntries } from "@/features/cellar";
import { getOwnProfile, ProfileView, SignInPrompt } from "@/features/profile";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { Page } from "@/components/ui/page";
import { PageTitle } from "@/components/ui/page-title";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const locale = toLocale((await params).locale);
  const { t } = await getTranslation(locale);
  return { title: t("profile.pageTitle") };
};

const ProfilePage = async ({ params }: Props) => {
  const locale = toLocale((await params).locale);
  const session = await auth();

  if (!session?.user) {
    const { t } = await getTranslation(locale);
    return (
      <Page>
        <PageTitle>{t("profile.title")}</PageTitle>
        <SignInPrompt locale={locale} />
      </Page>
    );
  }

  const [profile, beers] = await Promise.all([getOwnProfile(locale), listCellarEntries().catch(() => null)]);

  return (
    <Page width="wide">
      <ProfileView locale={locale} profile={profile} counts={beers && cellarCounts(beers)} />
    </Page>
  );
};

export default ProfilePage;

import type { Metadata } from "next";
import { auth } from "@/auth";
import { cellarCounts, listCellarEntries } from "@/features/cellar";
import { getProfile, ProfileView, SignInPrompt } from "@/features/profile";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { Page } from "@/components/ui/page";

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
        <h1 className="font-display text-title font-extrabold text-balance text-foreground md:text-display">
          {t("profile.title")}
        </h1>
        <SignInPrompt locale={locale} />
      </Page>
    );
  }

  const [profile, beers] = await Promise.all([getProfile(), listCellarEntries().catch(() => null)]);

  return (
    <Page width="wide">
      <ProfileView locale={locale} profile={profile} counts={beers && cellarCounts(beers)} />
    </Page>
  );
};

export default ProfilePage;

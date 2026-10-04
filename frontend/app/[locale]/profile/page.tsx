import type { Metadata } from "next";
import { auth } from "@/auth";
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
  const { t } = await getTranslation(locale);

  return (
    <Page>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        {t("profile.title")}
      </h1>
      {session?.user ? (
        <ProfileView profile={await getProfile()} />
      ) : (
        <SignInPrompt locale={locale} />
      )}
    </Page>
  );
};

export default ProfilePage;

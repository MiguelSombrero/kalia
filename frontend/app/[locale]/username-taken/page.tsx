import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/features/auth";
import { getProfile, isUsernameTaken, UsernameTaken } from "@/features/profile";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { Page } from "@/components/ui/page";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const locale = toLocale((await params).locale);
  const { t } = await getTranslation(locale);
  return { title: t("usernameTaken.pageTitle") };
};

const UsernameTakenPage = async ({ params }: Props) => {
  const locale = toLocale((await params).locale);
  const session = await auth();
  const taken = session?.user ? await getProfile().then(() => false, isUsernameTaken) : false;

  if (!session?.user || !taken) {
    redirect(`/${locale}`);
  }

  const { t } = await getTranslation(locale);

  return (
    <Page width="narrow">
      <UsernameTaken
        locale={locale}
        username={session.user.name ?? ""}
        signOut={<SignOutButton>{t("auth.signOut")}</SignOutButton>}
      />
    </Page>
  );
};

export default UsernameTakenPage;

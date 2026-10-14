import { SignInPrompt as SignInPromptBlock } from "@/components/ui/sign-in-prompt";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { startProfileSignIn } from "./actions";

export const SignInPrompt = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <SignInPromptBlock
      title={t("profile.signIn.title")}
      hint={t("profile.signIn.hint")}
      signInLabel={t("profile.signIn.action")}
      signUpLabel={t("auth.signUp")}
      signUpHref={`/${locale}/sign-up`}
      signInAction={startProfileSignIn}
      locale={locale}
      headingLevel={2}
    />
  );
};

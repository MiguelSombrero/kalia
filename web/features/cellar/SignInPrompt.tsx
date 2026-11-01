import { SignInPrompt as SignInPromptBlock } from "@/components/ui/sign-in-prompt";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { signUpHref } from "@/lib/routes";
import { startCellarSignIn } from "./actions";

export const SignInPrompt = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <SignInPromptBlock
      title={t("cellar.signIn.title")}
      hint={t("cellar.signIn.hint")}
      signInLabel={t("cellar.signIn.action")}
      signUpLabel={t("auth.signUp")}
      signUpHref={signUpHref(locale)}
      signInAction={startCellarSignIn}
      locale={locale}
      headingLevel={2}
    />
  );
};

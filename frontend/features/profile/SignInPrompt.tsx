import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { startProfileSignIn } from "./actions";

export const SignInPrompt = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <EmptyState title={t("profile.signIn.title")}>
      <p>{t("profile.signIn.hint")}</p>
      <form action={startProfileSignIn} className="mt-4">
        <Button type="submit" variant="primary">
          {t("profile.signIn.action")}
        </Button>
      </form>
    </EmptyState>
  );
};

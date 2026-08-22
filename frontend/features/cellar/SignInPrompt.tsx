import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { startCellarSignIn } from "./actions";

export const SignInPrompt = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <EmptyState title={t("cellar.signIn.title")}>
      <p>{t("cellar.signIn.hint")}</p>
      <form action={startCellarSignIn} className="mt-4">
        <Button type="submit" variant="primary">
          {t("cellar.signIn.action")}
        </Button>
      </form>
    </EmptyState>
  );
};

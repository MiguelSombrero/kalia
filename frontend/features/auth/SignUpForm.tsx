import { Button } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { startSignUp } from "./actions";

type Props = { locale: Locale; error?: string };

export const SignUpForm = async ({ locale, error }: Props) => {
  const { t } = await getTranslation(locale);

  return (
    <form action={startSignUp} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {error === "agree-required" && (
        <p role="alert" className="text-sm text-foreground">
          {t("signUp.error.agreeRequired")}
        </p>
      )}
      {error === "rate-limited" && (
        <p role="alert" className="text-sm text-foreground">
          {t("signUp.error.rateLimited")}
        </p>
      )}
      <label className="flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" name="agree" required className="mt-1" />
        <span>{t("signUp.agree")}</span>
      </label>
      <Button type="submit" variant="primary">
        {t("signUp.action")}
      </Button>
    </form>
  );
};

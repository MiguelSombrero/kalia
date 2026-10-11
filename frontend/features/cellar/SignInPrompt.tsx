import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { startCellarSignIn } from "./actions";

export const SignInPrompt = async ({ locale }: { locale: Locale }) => {
  const { t } = await getTranslation(locale);

  return (
    <section className="flex max-w-xl flex-col items-start gap-4 border-t border-border pt-6">
      <SectionHeading level={2} look="heading">{t("cellar.signIn.title")}</SectionHeading>
      <p className="text-muted-foreground">{t("cellar.signIn.hint")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <form action={startCellarSignIn}>
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="primary">
            {t("cellar.signIn.action")}
          </Button>
        </form>
        <Link href={`/${locale}/sign-up`} className={buttonVariants("outline")}>
          {t("auth.signUp")}
        </Link>
      </div>
    </section>
  );
};

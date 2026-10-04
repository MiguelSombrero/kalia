import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignUpForm } from "@/features/auth";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { Page } from "@/components/ui/page";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const locale = toLocale((await params).locale);
  const { t } = await getTranslation(locale);
  return { title: t("signUp.pageTitle") };
};

const SignUpPage = async ({ params, searchParams }: Props) => {
  const locale = toLocale((await params).locale);
  const session = await auth();
  if (session?.user) {
    redirect(`/${locale}/profile`);
  }

  const { t } = await getTranslation(locale);
  const { error } = await searchParams;

  return (
    <Page width="narrow">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        {t("signUp.title")}
      </h1>
      <p className="text-muted-foreground">{t("signUp.hint")}</p>
      <SignUpForm locale={locale} error={error} />
    </Page>
  );
};

export default SignUpPage;

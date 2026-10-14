import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignUpForm } from "@/features/auth";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { Page } from "@/components/ui/page";
import { PageTitle } from "@/components/ui/page-title";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

const STEPS = ["here", "next", "inbox"] as const;

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
      <div className="flex flex-col gap-3">
        <PageTitle>{t("signUp.title")}</PageTitle>
        <p className="text-muted-foreground">{t("signUp.lead")}</p>
      </div>
      <ol className="border-t border-border">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-divider py-3.5"
          >
            <span aria-hidden="true" className="row-span-3 font-display text-title font-bold text-foreground">
              {index + 1}
            </span>
            <span className="text-label font-semibold uppercase text-muted-foreground">
              {t(`signUp.steps.${step}.where`)}
            </span>
            <span className="font-semibold text-foreground">{t(`signUp.steps.${step}.what`)}</span>
            {step === "next" && (
              <span className="text-sm text-muted-foreground">{t("signUp.steps.next.note")}</span>
            )}
          </li>
        ))}
      </ol>
      <SignUpForm locale={locale} error={error} />
    </Page>
  );
};

export default SignUpPage;

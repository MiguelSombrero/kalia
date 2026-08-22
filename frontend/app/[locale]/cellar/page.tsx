import type { Metadata } from "next";
import { auth } from "@/auth";
import { CellarList, listCellarEntries, SignInPrompt } from "@/features/cellar";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const locale = toLocale((await params).locale);
  const { t } = await getTranslation(locale);
  return { title: t("cellar.pageTitle") };
};

const CellarPage = async ({ params }: Props) => {
  const locale = toLocale((await params).locale);
  const session = await auth();
  const { t } = await getTranslation(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        {t("cellar.title")}
      </h1>
      {session?.user ? (
        <CellarList locale={locale} rows={await listCellarEntries()} />
      ) : (
        <SignInPrompt locale={locale} />
      )}
    </main>
  );
};

export default CellarPage;

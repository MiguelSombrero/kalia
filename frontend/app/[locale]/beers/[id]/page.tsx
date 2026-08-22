import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { BeerDetailsCard, getBeer } from "@/features/catalog";
import { AddToCellarButton } from "@/features/cellar";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";

type Props = { params: Promise<{ locale: string; id: string }> };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  const [beer, { t }] = await Promise.all([getBeer(id), getTranslation(locale)]);
  return {
    title: beer ? `${beer.name} — ${t("app.name")}` : t("notFound.pageTitle"),
  };
};

const BeerPage = async ({ params }: Props) => {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  const [beer, session] = await Promise.all([getBeer(id), auth()]);
  if (!beer) {
    notFound();
  }
  const { t } = await getTranslation(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <Link
        href={`/${locale}/beers`}
        className="text-sm text-muted-foreground underline underline-offset-2"
      >
        {t("beer.backToCatalog")}
      </Link>
      <BeerDetailsCard
        locale={locale}
        beer={beer}
        actions={
          <AddToCellarButton
            locale={locale}
            beerId={beer.id}
            beerName={beer.name}
            isSignedIn={Boolean(session?.user)}
          />
        }
      />
    </main>
  );
};

export default BeerPage;

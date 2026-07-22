import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBeer } from "@/features/catalog/api";
import { BeerDetailsCard } from "@/features/catalog/BeerDetailsCard";
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
  const beer = await getBeer(id);
  if (!beer) {
    notFound();
  }
  const { t } = await getTranslation(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <Link
        href={`/${locale}/beers`}
        className="text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
      >
        {t("beer.backToCatalog")}
      </Link>
      <BeerDetailsCard locale={locale} beer={beer} />
    </main>
  );
};

export default BeerPage;

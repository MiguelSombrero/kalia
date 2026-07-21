import Link from "next/link";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";

type Props = { params: Promise<{ locale: string }> };

const Home = async ({ params }: Props) => {
  const locale = toLocale((await params).locale);
  const { t } = await getTranslation(locale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold tracking-tight">{t("app.name")}</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">{t("app.tagline")}</p>
      <Link
        href={`/${locale}/beers`}
        className="mt-2 rounded-md bg-zinc-900 px-5 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {t("app.browseCatalog")}
      </Link>
    </main>
  );
};

export default Home;

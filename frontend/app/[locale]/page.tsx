import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { cn } from "@/lib/cn";

type Props = { params: Promise<{ locale: string }> };

const Home = async ({ params }: Props) => {
  const locale = toLocale((await params).locale);
  const { t } = await getTranslation(locale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
        {t("app.name")}
      </h1>
      <p className="text-lg text-muted-foreground">{t("app.tagline")}</p>
      <Link href={`/${locale}/beers`} className={cn(buttonVariants("primary"), "mt-2")}>
        {t("app.browseCatalog")}
      </Link>
    </main>
  );
};

export default Home;

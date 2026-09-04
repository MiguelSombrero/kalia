import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPublicCellar, PublicCellarView, resolvePublicCellarBeers } from "@/features/cellar";
import { getProfile } from "@/features/profile";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";

type Props = { params: Promise<{ locale: string; username: string }> };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { locale: rawLocale, username } = await params;
  const locale = toLocale(rawLocale);
  const [cellar, { t }] = await Promise.all([getPublicCellar(username), getTranslation(locale)]);

  // noindex/nofollow on every branch: "anyone with the link" is the promise
  // the visibility control makes (ADR-0050), and a not-found page has nothing
  // to index either.
  const robots = { index: false, follow: false };

  if (!cellar) {
    return { title: `${t("notFound.generic.title")} — ${t("app.name")}`, robots };
  }

  return {
    title: `${t("cellar.public.heading", { username: cellar.username })} — ${t("app.name")}`,
    robots,
    // Canonical is the locale-less share URL, the same on both locale-prefixed
    // pages, so anything that de-duplicates sees one page not two (ADR-0050).
    alternates: {
      canonical: `/cellars/${cellar.username}`,
      languages: {
        en: `/en/cellars/${cellar.username}`,
        fi: `/fi/cellars/${cellar.username}`,
        "x-default": `/cellars/${cellar.username}`,
      },
    },
  };
};

const PublicCellarPage = async ({ params }: Props) => {
  const { locale: rawLocale, username } = await params;
  const locale = toLocale(rawLocale);
  const [cellar, session, { t }] = await Promise.all([
    getPublicCellar(username),
    auth(),
    getTranslation(locale),
  ]);

  if (!cellar) {
    notFound();
  }

  const [beers, viewerProfile] = await Promise.all([
    resolvePublicCellarBeers(cellar),
    // The banner is the one caller-dependent thing on the page (ADR-0050); the
    // cellar itself was fetched identically for every caller above.
    session?.user ? getProfile().catch(() => null) : Promise.resolve(null),
  ]);
  const isOwner = viewerProfile?.username === cellar.username;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        {t("cellar.public.heading", { username: cellar.username })}
      </h1>
      <PublicCellarView locale={locale} beers={beers} isOwner={isOwner} />
    </main>
  );
};

export default PublicCellarPage;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPublicCellar, PublicCellarView, toPublicCellarPage, type PublicCellar } from "@/features/cellar";
import { getProfile } from "@/features/profile";
import { getTranslation } from "@/i18n/server";
import { locales, toLocale } from "@/i18n/settings";
import { cellarHref, shareableCellarHref } from "@/lib/routes";
import { Page } from "@/components/ui/page";

type Props = {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

// Do not pass the route param on as it is: Next.js hands a dynamic segment
// over still percent-encoded, and the API client encodes it again, so a
// username with any non-ASCII letter would reach the backend double-encoded.
const publicCellarAt = async (encodedUsername: string, page: number): Promise<PublicCellar | null> => {
  let username: string;
  try {
    username = decodeURIComponent(encodedUsername);
  } catch {
    return null;
  }
  return getPublicCellar(username, page);
};

// generateMetadata and the page read the same page, so the two requests are one
// fetch (web/README.md).
export const generateMetadata = async ({ params, searchParams }: Props): Promise<Metadata> => {
  const { locale: rawLocale, username } = await params;
  const page = toPublicCellarPage((await searchParams).page);
  const locale = toLocale(rawLocale);
  const [cellar, { t }] = await Promise.all([publicCellarAt(username, page), getTranslation(locale)]);

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
      canonical: shareableCellarHref(cellar.username),
      languages: {
        ...Object.fromEntries(locales.map((locale) => [locale, cellarHref(locale, cellar.username)])),
        "x-default": shareableCellarHref(cellar.username),
      },
    },
  };
};

const PublicCellarPage = async ({ params, searchParams }: Props) => {
  const { locale: rawLocale, username } = await params;
  const page = toPublicCellarPage((await searchParams).page);
  const locale = toLocale(rawLocale);
  const [cellar, session] = await Promise.all([publicCellarAt(username, page), auth()]);

  // A page past the last one is as absent as a cellar that is not there.
  if (!cellar || (page > 0 && page >= cellar.totalPages)) {
    notFound();
  }

  // The banner is the one caller-dependent thing on the page (ADR-0050); the
  // cellar itself was fetched identically for every caller above.
  const viewerProfile = session?.user ? await getProfile().catch(() => null) : null;
  const isOwner = viewerProfile?.username === cellar.username;

  return (
    <Page width="wide">
      <PublicCellarView locale={locale} cellar={cellar} isOwner={isOwner} />
    </Page>
  );
};

export default PublicCellarPage;

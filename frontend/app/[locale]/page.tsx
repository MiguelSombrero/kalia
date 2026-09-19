import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedList, readFeed } from "@/features/feed";
import { getProfile } from "@/features/profile";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const locale = toLocale((await params).locale);
  const { t } = await getTranslation(locale);
  return {
    title: t("app.name"),
    description: t("app.tagline"),
    // The feed names usernames beside what they added; indexing is the one
    // part of discoverability that cannot be undone on a user's timescale
    // (ADR-0059).
    robots: { index: false, follow: false },
  };
};

const Home = async ({ params }: Props) => {
  const locale = toLocale((await params).locale);
  const [page, session, { t }] = await Promise.all([readFeed(), auth(), getTranslation(locale)]);
  const viewerProfile = session?.user ? await getProfile().catch(() => null) : null;
  const now = new Date();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {t("app.name")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("app.tagline")}</p>
      </div>

      {page.content.length === 0 ? (
        <EmptyState title={t("feed.empty.title")}>
          <p>{t("feed.empty.hint")}</p>
          {viewerProfile && !viewerProfile.cellarPublic && (
            <p>
              {t("feed.empty.privateHint")}{" "}
              <Link href={`/${locale}/profile`} className="underline underline-offset-2">
                {t("feed.empty.privateLink")}
              </Link>
            </p>
          )}
        </EmptyState>
      ) : (
        <FeedList locale={locale} now={now.toISOString()} initialPage={page} />
      )}
    </main>
  );
};

export default Home;

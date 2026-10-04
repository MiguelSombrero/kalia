import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { Page } from "@/components/ui/page";
import { CellarSummary, listCellarEntries } from "@/features/cellar";
import { FeedError, FeedList, readFeed } from "@/features/feed";
import { getProfile } from "@/features/profile";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { cn } from "@/lib/cn";
import { logger } from "@/lib/logger";
import { feedHeadingRow, mastheadGrid } from "./frontPageLayout";

type Props = { params: Promise<{ locale: string }> };

const HOW_STEPS = ["find", "cellar", "share"] as const;

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

const readFeedOrNull = () =>
  readFeed().catch((error: unknown) => {
    logger.error(error);
    return null;
  });

const Home = async ({ params }: Props) => {
  const locale = toLocale((await params).locale);
  const [page, session, { t }] = await Promise.all([readFeedOrNull(), auth(), getTranslation(locale)]);
  const [viewerProfile, cellarRows] = session?.user
    ? await Promise.all([getProfile().catch(() => null), listCellarEntries().catch(() => null)])
    : [null, null];
  const now = new Date();

  const emptyState = (
    <div className="flex flex-col items-start gap-2.5 py-8">
      <div aria-hidden="true" className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className="size-7 border border-border" />
        ))}
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{t("feed.empty.title")}</p>
      {viewerProfile && <p className="text-muted-foreground">{t("feed.empty.hint")}</p>}
      {!session?.user && (
        <Link href={`/${locale}/sign-up`} className={buttonVariants("primary")}>
          {t("auth.signUp")}
        </Link>
      )}
      {viewerProfile && !viewerProfile.cellarPublic && (
        <p className="text-muted-foreground">
          {t("feed.empty.privateHint")}{" "}
          <Link href={`/${locale}/profile`} className="text-foreground underline underline-offset-2">
            {t("feed.empty.privateLink")}
          </Link>
        </p>
      )}
    </div>
  );

  return (
    <Page width="wide">
      {viewerProfile ? (
        <>
          <h1 className="sr-only">{t("app.name")}</h1>
          <CellarSummary
            locale={locale}
            cellarPublic={viewerProfile.cellarPublic}
            counts={
              cellarRows && {
                bottles: cellarRows.reduce((sum, row) => sum + row.bottleCount, 0),
                beers: cellarRows.length,
              }
            }
          />
        </>
      ) : (
        <div className="flex flex-col gap-6">
          <div className={mastheadGrid}>
            <h1 className="font-display text-title font-extrabold text-balance text-foreground md:text-display">
              {t("app.tagline")}
            </h1>
            <p className="text-muted-foreground">{t("feed.empty.hint")}</p>
          </div>
          <section aria-labelledby="how-heading" className="flex flex-col gap-1.5">
            <h2 id="how-heading" className="text-label font-semibold uppercase text-foreground">
              {t("home.how.heading")}
            </h2>
            <ol className="border-t border-border md:grid md:grid-cols-3 md:gap-x-8 md:border-b md:border-divider">
              {HOW_STEPS.map((step, index) => (
                <li
                  key={step}
                  className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-divider py-3 md:border-b-0"
                >
                  <span aria-hidden="true" className="row-span-2 font-display text-xl font-extrabold">
                    {`0${index + 1}`}
                  </span>
                  <span className="font-bold text-foreground">{t(`home.how.${step}.title`)}</span>
                  <span className="text-sm text-muted-foreground">{t(`home.how.${step}.body`)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}

      <section aria-labelledby="feed-heading" className="flex flex-col">
        <h2 id="feed-heading" className={cn(feedHeadingRow, "text-label font-semibold uppercase text-foreground")}>
          {t("feed.heading")}
        </h2>
        {page ? (
          <FeedList
            locale={locale}
            now={now.toISOString()}
            initialPage={page}
            emptyState={emptyState}
            viewerUsername={viewerProfile?.username}
          />
        ) : (
          <FeedError />
        )}
      </section>
    </Page>
  );
};

export default Home;

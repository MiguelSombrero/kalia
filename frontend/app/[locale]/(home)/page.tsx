import type { Metadata } from "next";
import { auth } from "@/auth";
import { Page } from "@/components/ui/page";
import { PageTitle } from "@/components/ui/page-title";
import { SectionHeading } from "@/components/ui/section-heading";
import { CellarSummary, cellarCounts, listCellarEntries } from "@/features/cellar";
import {
  FeedEmptyState,
  FeedError,
  FeedList,
  FrontPagePitch,
  feedHeadingRow,
  readFeed,
} from "@/features/feed";
import { getOwnProfileOrNull } from "@/features/profile";
import { getTranslation } from "@/i18n/server";
import { toLocale } from "@/i18n/settings";
import { logger } from "@/lib/logger";

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

const readFeedOrNull = () =>
  readFeed().catch((error: unknown) => {
    logger.error(error);
    return null;
  });

const Home = async ({ params }: Props) => {
  const locale = toLocale((await params).locale);
  const [page, session, { t }] = await Promise.all([readFeedOrNull(), auth(), getTranslation(locale)]);
  const [viewerProfile, cellarRows] = session?.user
    ? await Promise.all([getOwnProfileOrNull(locale), listCellarEntries().catch(() => null)])
    : [null, null];
  const now = new Date();

  return (
    <Page width="wide">
      {viewerProfile ? (
        <>
          <PageTitle className="sr-only">{t("app.name")}</PageTitle>
          <CellarSummary
            locale={locale}
            cellarPublic={viewerProfile.cellarPublic}
            counts={cellarRows && cellarCounts(cellarRows)}
          />
        </>
      ) : (
        <FrontPagePitch locale={locale} />
      )}

      <section aria-labelledby="feed-heading" className="flex flex-col">
        <SectionHeading level={2} look="label" id="feed-heading" className={feedHeadingRow}>
          {t("feed.heading")}
        </SectionHeading>
        {page ? (
          <FeedList
            locale={locale}
            now={now.toISOString()}
            initialPage={page}
            emptyState={
              <FeedEmptyState locale={locale} signedIn={Boolean(session?.user)} viewer={viewerProfile} />
            }
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

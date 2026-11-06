import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { getTranslation } from "@/i18n/server";
import type { Locale } from "@/i18n/settings";
import { countryName } from "@/lib/countryName";
import { formatRelativeInstant } from "@/lib/relativeInstant";
import { adminHref } from "@/lib/routes";
import { listSuggestions } from "./api";
import { QueuePager } from "./QueuePager";
import { ReviewWorkspace } from "./ReviewWorkspace";
import type { BreweryOption, EditOptions, QueuePage, SuggestionPage, SuggestionRow } from "./types";

const toRows = (page: SuggestionPage, locale: Locale): SuggestionRow[] => {
  const now = new Date();
  return page.content.map((suggestion) => {
    const { brewery, contributor } = suggestion;
    const country = countryName(brewery.countryCode, locale);
    return {
      id: suggestion.id,
      name: suggestion.name,
      style: suggestion.style,
      abv: suggestion.abv,
      brewery: {
        id: brewery.id,
        name: brewery.name,
        countryCode: brewery.countryCode,
        city: brewery.city,
        place: brewery.city ? `${brewery.city}, ${country}` : country,
      },
      breweryIsNew: suggestion.breweryIsNew,
      username: contributor.username,
      pendingCount: contributor.pendingCount,
      rejectedCount: contributor.rejectedCount,
      suggestedAt: suggestion.suggestedAt,
      waited: formatRelativeInstant(suggestion.suggestedAt, locale, now).text,
    };
  });
};

const load = async (page: number): Promise<SuggestionPage | null> => {
  try {
    return await listSuggestions(page);
  } catch {
    return null;
  }
};

/** The queue and the suggestion beside it, as the admin page renders them below its guard. */
export const ReviewQueue = async ({
  locale,
  page,
  loadOptions,
  findBreweries,
}: {
  locale: Locale;
  /** Zero-based. */
  page: number;
  loadOptions: (locale: string) => Promise<EditOptions>;
  findBreweries: (query: string, locale: string) => Promise<BreweryOption[]>;
}) => {
  const { t } = await getTranslation(locale);
  const result = await load(page);

  if (result === null) {
    return (
      <ErrorAlert
        action={
          <a href={adminHref(locale)} className={buttonVariants("outline", "compact")}>
            {t("admin.review.reload")}
          </a>
        }
      >
        {t("admin.review.loadFailed")}
      </ErrorAlert>
    );
  }

  // A page past the end, after the queue shrank: show the last one.
  if (result.content.length === 0 && result.totalPages > 0 && page > 0) {
    redirect(`${adminHref(locale)}?page=${result.totalPages}`);
  }

  const queue: QueuePage = {
    rows: toRows(result, locale),
    page: result.page,
    totalPages: result.totalPages,
    totalElements: result.totalElements,
  };

  return (
    <ReviewWorkspace
      locale={locale}
      queue={queue}
      pager={<QueuePager locale={locale} page={result.page} totalPages={result.totalPages} />}
      loadOptions={loadOptions}
      findBreweries={findBreweries}
    />
  );
};

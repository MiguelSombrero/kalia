import { FeedSkeleton } from "./FeedSkeleton";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";
import { Page } from "@/components/ui/page";

const HomeLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page>
      <FeedSkeleton locale={locale} />
    </Page>
  );
};

export default HomeLoading;

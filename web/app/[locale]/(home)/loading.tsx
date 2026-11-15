import { Page } from "@/components/ui/page";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";

import { FeedSkeleton } from "./FeedSkeleton";

const HomeLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page width="wide">
      <FeedSkeleton locale={locale} />
    </Page>
  );
};

export default HomeLoading;

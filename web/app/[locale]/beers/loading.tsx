import { Page } from "@/components/ui/page";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";

import { BeerListSkeleton } from "./BeerListSkeleton";

const BeersLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page width="wide">
      <BeerListSkeleton locale={locale} />
    </Page>
  );
};

export default BeersLoading;

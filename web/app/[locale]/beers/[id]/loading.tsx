import { Page } from "@/components/ui/page";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";

import { BeerDetailsSkeleton } from "./BeerDetailsSkeleton";

const BeerLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page width="wide">
      <BeerDetailsSkeleton locale={locale} />
    </Page>
  );
};

export default BeerLoading;

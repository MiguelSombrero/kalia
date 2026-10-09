import { BeerDetailsSkeleton } from "./BeerDetailsSkeleton";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";
import { Page } from "@/components/ui/page";

const BeerLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page width="wide">
      <BeerDetailsSkeleton locale={locale} />
    </Page>
  );
};

export default BeerLoading;

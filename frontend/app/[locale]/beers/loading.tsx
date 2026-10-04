import { BeerListSkeleton } from "./BeerListSkeleton";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";
import { Page } from "@/components/ui/page";

const BeersLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page width="wide">
      <BeerListSkeleton locale={locale} />
    </Page>
  );
};

export default BeersLoading;

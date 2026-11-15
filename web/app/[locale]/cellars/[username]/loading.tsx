import { Page } from "@/components/ui/page";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";

import { PublicCellarSkeleton } from "./PublicCellarSkeleton";

const PublicCellarLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page width="wide">
      <PublicCellarSkeleton locale={locale} />
    </Page>
  );
};

export default PublicCellarLoading;

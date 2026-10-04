import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";
import { PublicCellarSkeleton } from "./PublicCellarSkeleton";
import { Page } from "@/components/ui/page";

const PublicCellarLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page>
      <PublicCellarSkeleton locale={locale} />
    </Page>
  );
};

export default PublicCellarLoading;

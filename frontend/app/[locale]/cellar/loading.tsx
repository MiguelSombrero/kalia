import { CellarListSkeleton } from "./CellarListSkeleton";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";
import { Page } from "@/components/ui/page";

const CellarLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page>
      <CellarListSkeleton locale={locale} />
    </Page>
  );
};

export default CellarLoading;

import { Page } from "@/components/ui/page";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";

import { CellarListSkeleton } from "./CellarListSkeleton";

const CellarLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page width="wide">
      <CellarListSkeleton locale={locale} />
    </Page>
  );
};

export default CellarLoading;

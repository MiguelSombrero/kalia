import { Page } from "@/components/ui/page";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";

import { UsernameTakenSkeleton } from "./UsernameTakenSkeleton";

const UsernameTakenLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page width="narrow">
      <UsernameTakenSkeleton locale={locale} />
    </Page>
  );
};

export default UsernameTakenLoading;

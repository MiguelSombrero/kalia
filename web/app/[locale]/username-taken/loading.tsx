import { UsernameTakenSkeleton } from "./UsernameTakenSkeleton";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";
import { Page } from "@/components/ui/page";

const UsernameTakenLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page width="narrow">
      <UsernameTakenSkeleton locale={locale} />
    </Page>
  );
};

export default UsernameTakenLoading;

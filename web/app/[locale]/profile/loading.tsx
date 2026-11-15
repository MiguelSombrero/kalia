import { Page } from "@/components/ui/page";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";

import { ProfileViewSkeleton } from "./ProfileViewSkeleton";

const ProfileLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page width="wide">
      <ProfileViewSkeleton locale={locale} />
    </Page>
  );
};

export default ProfileLoading;

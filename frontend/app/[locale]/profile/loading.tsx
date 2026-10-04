import { ProfileViewSkeleton } from "./ProfileViewSkeleton";
import { resolveLocaleFromHeaders } from "@/i18n/resolveLocale";
import { Page } from "@/components/ui/page";

const ProfileLoading = async () => {
  const locale = await resolveLocaleFromHeaders();

  return (
    <Page>
      <ProfileViewSkeleton locale={locale} />
    </Page>
  );
};

export default ProfileLoading;

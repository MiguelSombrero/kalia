import { useTranslation } from "react-i18next";
import { ComingSoon } from "@/components/ComingSoon";

export const ProfileScreen = () => {
  const { t } = useTranslation();

  return <ComingSoon heading={t("profile.title")} />;
};

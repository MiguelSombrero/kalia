import { useTranslation } from "react-i18next";
import { ComingSoon } from "@/components/ComingSoon";
import { useRouter } from "expo-router";

export const FeedScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();

  return <ComingSoon heading={t("nav.feed")} onBrowse={() => router.navigate("/catalog")} />;
};

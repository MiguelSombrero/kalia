import { useTranslation } from "react-i18next";
import { ComingSoon } from "@/components/ComingSoon";

export const CatalogScreen = () => {
  const { t } = useTranslation();

  return <ComingSoon heading={t("nav.catalog")} />;
};

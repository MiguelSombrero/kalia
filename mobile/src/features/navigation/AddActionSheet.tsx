import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { BodyText } from "@/components/BodyText";
import { spacing } from "@/components/metrics";
import { Sheet } from "@/components/Sheet";

export const AddActionSheet = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/catalog");
  };
  const browse = () => {
    if (router.canGoBack()) {
      router.dismiss();
      router.navigate("/catalog");
    } else {
      router.replace("/catalog");
    }
  };

  return (
    <Sheet title={t("mobileNavigation.addTitle")} closeLabel={t("mobileNavigation.close")} onClose={close}>
      <View style={spacing.blocks}>
        <BodyText>{t("mobileNavigation.scanComingSoon")}</BodyText>
        <ActionButton label={t("mobileNavigation.browse")} onPress={browse} />
      </View>
    </Sheet>
  );
};

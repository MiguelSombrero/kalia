import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { BodyText } from "@/components/BodyText";
import { spacing } from "@/components/metrics";
import { ScreenTitle } from "@/components/ScreenTitle";

type SignedOutProfileProps = { expired: boolean };

export const SignedOutProfile = ({ expired }: SignedOutProfileProps) => {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={spacing.blocks}>
      <View style={spacing.lines}>
        <ScreenTitle>{t("profile.signIn.title")}</ScreenTitle>
        <BodyText tone="muted">{t("profile.signIn.hint")}</BodyText>
        {expired ? <BodyText tone="error">{t("session.expired")}</BodyText> : null}
      </View>
      <ActionButton testID="profile-sign-in" label={t("profile.signIn.action")} onPress={() => router.push("/sign-in-sheet")} />
    </View>
  );
};

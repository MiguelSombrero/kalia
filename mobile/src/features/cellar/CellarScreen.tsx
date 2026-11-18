import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { BodyText } from "@/components/BodyText";
import { ComingSoon } from "@/components/ComingSoon";
import { spacing } from "@/components/metrics";
import { Screen } from "@/components/Screen";
import { ScreenTitle } from "@/components/ScreenTitle";
import { useAuth } from "@/lib/auth/AuthProvider";

export const CellarScreen = () => {
  const { t } = useTranslation();
  const { state } = useAuth();
  const router = useRouter();

  if (state.status !== "signedIn") {
    return (
      <Screen>
        <View style={spacing.blocks}>
          <View style={spacing.lines}>
            <ScreenTitle>{t("nav.cellar")}</ScreenTitle>
            {state.status === "signedOut" ? (
              <>
                <BodyText tone="muted">{t("mobileNavigation.cellarInvitation")}</BodyText>
                <BodyText tone="muted">{t("placeholder.comingSoon")}</BodyText>
              </>
            ) : null}
          </View>
          {state.status === "signedOut" ? (
            <>
              <ActionButton label={t("profile.signIn.action")} onPress={() => router.push("/sign-in-sheet")} />
              <ActionButton label={t("mobileNavigation.browse")} onPress={() => router.navigate("/catalog")} variant="secondary" />
            </>
          ) : null}
        </View>
      </Screen>
    );
  }
  return <ComingSoon heading={t("nav.cellar")} onBrowse={() => router.navigate("/catalog")} />;
};

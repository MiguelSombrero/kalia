import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { BodyText } from "@/components/BodyText";
import { spacing } from "@/components/metrics";
import { Screen } from "@/components/Screen";
import { ScreenTitle } from "@/components/ScreenTitle";
import { useAuth } from "@/lib/auth/AuthProvider";

import { CellarList } from "./CellarList";
import { sampleCellar } from "./sampleCellar";

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
  return (
    <Screen scroll={false}>
      <CellarList entries={sampleCellar} onOpen={(entry) => router.push({ pathname: "/cellar/[id]", params: { id: entry.id } })} onAdd={() => router.push("/add-sheet")} onBrowse={() => router.navigate("/catalog")} />
    </Screen>
  );
};

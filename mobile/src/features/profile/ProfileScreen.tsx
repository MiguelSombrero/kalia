import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { BuildInfo } from "@/components/BuildInfo";
import { Screen } from "@/components/Screen";
import { ScreenTitle } from "@/components/ScreenTitle";
import { useAuth } from "@/lib/auth/AuthProvider";
import { theme } from "@/lib/design/theme.generated";

import { SignedInProfile } from "./SignedInProfile";
import { SignedOutProfile } from "./SignedOutProfile";

const styles = StyleSheet.create({ about: { gap: theme.spacing.xlarge } });

export const ProfileScreen = () => {
  const { t } = useTranslation();
  const { state } = useAuth();

  return (
    <Screen>
      <View style={styles.about}>
        <View>
          {state.status !== "signedOut" ? <ScreenTitle>{t("profile.title")}</ScreenTitle> : null}
          {state.status === "signedOut" ? <SignedOutProfile expired={state.expired} /> : null}
          {state.status === "signedIn" ? <SignedInProfile /> : null}
        </View>
        <BuildInfo />
      </View>
    </Screen>
  );
};

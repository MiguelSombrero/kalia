import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ActionButton } from "@/components/ActionButton";
import { BuildInfo } from "@/components/BuildInfo";
import { BodyText } from "@/components/BodyText";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { ScreenTitle } from "@/components/ScreenTitle";
import { PersonSlot } from "@/components/PersonSlot";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMyProfile } from "./hooks/useMyProfile";

const SignedOut = ({ expired }: { expired: boolean }) => {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View>
      <ScreenTitle>{t("profile.signIn.title")}</ScreenTitle>
      <BodyText tone="muted" spaced>{t("profile.signIn.hint")}</BodyText>
      {expired ? <BodyText tone="error" spaced>{t("session.expired")}</BodyText> : null}
      <ActionButton testID="profile-sign-in" label={t("profile.signIn.action")} onPress={() => router.push("/sign-in-sheet")} />
    </View>
  );
};

const SignedIn = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const profile = useMyProfile();

  return (
    <View>
      {profile.isPending ? <LoadingState label={t("profile.loading")} spaced /> : null}
      {profile.data ? (
        <View style={styles.who}>
          <PersonSlot name={profile.data.username} />
          <Text style={styles.lead}>{t("session.signedIn", { username: profile.data.username })}</Text>
        </View>
      ) : null}
      {profile.isError ? (
        <ErrorAlert message={t("session.profileFailed")} error={profile.error} onRetry={() => void profile.refetch()} retrying={profile.isFetching} spaced />
      ) : null}
      <ActionButton label={t("auth.signOut")} onPress={() => void signOut().catch(() => undefined)} variant="secondary" />
    </View>
  );
};

export const ProfileScreen = () => {
  const { t } = useTranslation();
  const { state } = useAuth();

  return (
    <Screen>
      {state.status !== "signedOut" ? <ScreenTitle>{t("profile.title")}</ScreenTitle> : null}
      {state.status === "signedOut" ? <SignedOut expired={state.expired} /> : null}
      {state.status === "signedIn" ? <SignedIn /> : null}
      <BuildInfo />
    </Screen>
  );
};

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    who: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.medium,
      marginTop: theme.spacing.large,
      padding: theme.spacing.medium,
      borderRadius: theme.radius.card,
      backgroundColor: colors["surface-sunken"],
    },
    lead: { flex: 1, ...textStyle("item-title", "bold"), color: colors.foreground },
  });
};

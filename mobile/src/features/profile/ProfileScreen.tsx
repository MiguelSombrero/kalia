import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ActionButton } from "@/components/ActionButton";
import { BuildInfo } from "@/components/BuildInfo";
import { ErrorReference } from "@/components/ErrorReference";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMyProfile } from "./hooks/useMyProfile";

const SignedOut = ({ expired }: { expired: boolean }) => {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View>
      <Text style={styles.lead}>{t("profile.signIn.title")}</Text>
      <Text style={styles.body}>{t("profile.signIn.hint")}</Text>
      {expired ? <Text style={styles.notice}>{t("session.expired")}</Text> : null}
      <ActionButton label={t("profile.signIn.action")} onPress={() => router.push("/sign-in-sheet")} />
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
      {profile.isPending ? <Text style={styles.body}>{t("profile.loading")}</Text> : null}
      {profile.data ? <Text style={styles.lead}>{t("session.signedIn", { username: profile.data.username })}</Text> : null}
      {profile.isError ? (
        <>
          <Text style={styles.notice}>{t("session.profileFailed")}</Text>
          <ErrorReference error={profile.error} />
          <ActionButton label={t("error.retry")} onPress={() => void profile.refetch()} busy={profile.isFetching} />
        </>
      ) : null}
      <ActionButton label={t("auth.signOut")} onPress={() => void signOut().catch(() => undefined)} />
    </View>
  );
};

export const ProfileScreen = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const { state } = useAuth();

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text role="heading" style={styles.heading}>
          {t("profile.title")}
        </Text>
        {state.status === "signedOut" ? <SignedOut expired={state.expired} /> : null}
        {state.status === "signedIn" ? <SignedIn /> : null}
        <BuildInfo />
      </ScrollView>
    </SafeAreaView>
  );
};

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: theme.spacing.large },
    heading: { fontSize: theme.typography.title.size, fontWeight: theme.weights.bold, color: colors.foreground },
    lead: { marginTop: theme.spacing.medium, fontSize: theme.typography.heading.size, fontWeight: theme.weights.semibold, color: colors.foreground },
    body: { marginTop: theme.spacing.small, fontSize: theme.typography.body.size, color: colors["muted-foreground"] },
    notice: { marginTop: theme.spacing.medium, fontSize: theme.typography.body.size, color: colors.destructive },
  });
};

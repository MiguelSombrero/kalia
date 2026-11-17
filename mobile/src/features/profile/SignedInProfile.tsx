import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingState } from "@/components/LoadingState";
import { spacing } from "@/components/metrics";
import { PersonSlot } from "@/components/PersonSlot";
import { useAuth } from "@/lib/auth/AuthProvider";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

import { useMyProfile } from "./hooks/useMyProfile";

export const SignedInProfile = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const profile = useMyProfile();

  return (
    <View style={spacing.blocks}>
      {profile.isPending ? (
        <View style={styles.status}>
          <LoadingState label={t("profile.loading")} />
        </View>
      ) : null}
      {profile.data ? (
        <View style={styles.who}>
          <PersonSlot name={profile.data.username} />
          <Text style={styles.lead}>{t("session.signedIn", { username: profile.data.username })}</Text>
        </View>
      ) : null}
      {profile.isError ? (
        <View style={styles.status}>
          <ErrorAlert message={t("session.profileFailed")} error={profile.error} onRetry={() => void profile.refetch()} retrying={profile.isFetching} />
        </View>
      ) : null}
      <ActionButton label={t("auth.signOut")} onPress={() => void signOut().catch(() => undefined)} variant="secondary" />
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  status: { marginTop: theme.spacing.medium },
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
}));

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ActionButton } from "@/components/ActionButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMyProfile } from "./hooks/useMyProfile";

const SignedOut = ({ expired }: { expired: boolean }) => {
  const { t, i18n } = useTranslation();
  const { signIn } = useAuth();
  const [failed, setFailed] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const start = async () => {
    setFailed(false);
    setSigningIn(true);
    try {
      setFailed((await signIn(i18n.language)) === "failed");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <View>
      <Text style={styles.lead}>{t("profile.signIn.title")}</Text>
      <Text style={styles.body}>{t("profile.signIn.hint")}</Text>
      {expired && !failed ? <Text style={styles.notice}>{t("session.expired")}</Text> : null}
      {failed ? <Text style={styles.notice}>{t("session.signInFailed")}</Text> : null}
      <ActionButton label={t("profile.signIn.action")} onPress={() => void start()} busy={signingIn} />
    </View>
  );
};

const SignedIn = () => {
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
          <ActionButton label={t("error.retry")} onPress={() => void profile.refetch()} busy={profile.isFetching} />
        </>
      ) : null}
      <ActionButton label={t("auth.signOut")} onPress={() => void signOut().catch(() => undefined)} />
    </View>
  );
};

export const ProfileScreen = () => {
  const { t } = useTranslation();
  const { state } = useAuth();

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <Text role="heading" style={styles.heading}>
        {t("profile.title")}
      </Text>
      {state.status === "signedOut" ? <SignedOut expired={state.expired} /> : null}
      {state.status === "signedIn" ? <SignedIn /> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, backgroundColor: "#ffffff" },
  heading: { fontSize: 28, fontWeight: "700", color: "#111111" },
  lead: { marginTop: 16, fontSize: 20, fontWeight: "600", color: "#111111" },
  body: { marginTop: 8, fontSize: 17, color: "#444444" },
  notice: { marginTop: 16, fontSize: 17, color: "#8a1c1c" },
});

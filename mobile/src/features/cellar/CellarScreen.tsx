import { useTranslation } from "react-i18next";
import { ActionButton } from "@/components/ActionButton";
import { BodyText } from "@/components/BodyText";
import { ComingSoon } from "@/components/ComingSoon";
import { Screen } from "@/components/Screen";
import { ScreenTitle } from "@/components/ScreenTitle";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRouter } from "expo-router";

export const CellarScreen = () => {
  const { t } = useTranslation();
  const { state } = useAuth();
  const router = useRouter();

  if (state.status !== "signedIn") {
    return (
      <Screen>
        <ScreenTitle>{t("nav.cellar")}</ScreenTitle>
        {state.status === "signedOut" ? (
          <>
            <BodyText tone="muted" spaced>{t("mobileNavigation.cellarInvitation")}</BodyText>
            <BodyText tone="muted" spaced>{t("placeholder.comingSoon")}</BodyText>
            <ActionButton label={t("profile.signIn.action")} onPress={() => router.push("/sign-in-sheet")} />
            <ActionButton label={t("mobileNavigation.browse")} onPress={() => router.navigate("/catalog")} variant="secondary" />
          </>
        ) : null}
      </Screen>
    );
  }
  return <ComingSoon heading={t("nav.cellar")} onBrowse={() => router.navigate("/catalog")} />;
};

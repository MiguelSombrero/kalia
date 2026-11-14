import { ActionButton } from "@/components/ActionButton";
import { BodyText } from "@/components/BodyText";
import { Sheet } from "@/components/Sheet";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const SignInSheet = () => {
  const { t, i18n } = useTranslation();
  const { signIn } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/catalog");
  };
  const start = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const result = await signIn(i18n.language);
      if (!mounted.current) return;
      if (result === "signedIn") close();
      if (result === "failed") setFailed(true);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <Sheet title={t("profile.signIn.action")} closeLabel={t("mobileNavigation.close")} onClose={close} closeDisabled={busy}>
      <BodyText>{t("mobileNavigation.signInHint")}</BodyText>
      {failed ? <BodyText tone="error" spaced>{t("session.signInFailed")}</BodyText> : null}
      <ActionButton testID="sign-in-sheet-action" label={t("profile.signIn.action")} onPress={() => void start()} busy={busy} />
    </Sheet>
  );
};

import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ActionButton } from "@/components/ActionButton";

type Reason = "updateRequired" | "maintenance";

export const BlockedScreen = ({
  reason,
  onCheckAgain,
  isChecking,
}: {
  reason: Reason;
  onCheckAgain: () => void;
  isChecking: boolean;
}) => {
  const { t } = useTranslation();
  const checkAgain = t("appConfig.checkAgain");

  return (
    <SafeAreaView style={styles.screen}>
      <Text role="heading" style={styles.title}>
        {t(`appConfig.${reason}.title`)}
      </Text>
      <Text style={styles.body}>{t(`appConfig.${reason}.body`)}</Text>
      <ActionButton label={checkAgain} onPress={onCheckAgain} busy={isChecking} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#ffffff" },
  title: { fontSize: 28, fontWeight: "700", color: "#111111" },
  body: { marginTop: 8, fontSize: 17, color: "#444444" },
});

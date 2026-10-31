import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

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
      <Pressable
        role="button"
        accessibilityLabel={checkAgain}
        accessibilityState={{ busy: isChecking, disabled: isChecking }}
        disabled={isChecking}
        onPress={onCheckAgain}
        style={[styles.button, isChecking && styles.buttonBusy]}
      >
        <Text style={styles.buttonText}>{checkAgain}</Text>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#ffffff" },
  title: { fontSize: 28, fontWeight: "700", color: "#111111" },
  body: { marginTop: 8, fontSize: 17, color: "#444444" },
  button: {
    alignSelf: "flex-start",
    marginTop: 24,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#111111",
  },
  buttonBusy: { opacity: 0.5 },
  buttonText: { fontSize: 17, fontWeight: "600", color: "#ffffff" },
});

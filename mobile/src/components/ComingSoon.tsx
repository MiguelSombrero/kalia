import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export const ComingSoon = ({ heading }: { heading: string }) => {
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <Text role="heading" style={styles.heading}>
        {heading}
      </Text>
      <Text style={styles.notice}>{t("placeholder.comingSoon")}</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, backgroundColor: "#ffffff" },
  heading: { fontSize: 28, fontWeight: "700", color: "#111111" },
  notice: { marginTop: 8, fontSize: 17, color: "#444444" },
});

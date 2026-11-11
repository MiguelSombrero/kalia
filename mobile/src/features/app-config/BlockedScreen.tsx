import { textStyle, titleScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
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
  const styles = useStyles();
  const { t } = useTranslation();
  const checkAgain = t("appConfig.checkAgain");

  return (
    <SafeAreaView style={styles.screen}>
      <Text role="heading" {...titleScale} style={styles.title}>
        {t(`appConfig.${reason}.title`)}
      </Text>
      <Text style={styles.body}>{t(`appConfig.${reason}.body`)}</Text>
      <ActionButton label={checkAgain} onPress={onCheckAgain} busy={isChecking} />
    </SafeAreaView>
  );
};

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    screen: { flex: 1, justifyContent: "center", padding: theme.spacing.medium, backgroundColor: colors.background },
    title: { ...textStyle("screen-title", "bold"), color: colors.foreground },
    body: { marginTop: theme.spacing.medium, ...textStyle("body", "medium"), color: colors["muted-foreground"] },
  });
};

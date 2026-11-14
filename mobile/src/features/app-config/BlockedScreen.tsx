import { textStyle, titleScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { ScrollView, Text } from "react-native";
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
    <SafeAreaView testID="blocked-screen" style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text role="heading" {...titleScale} style={styles.title}>
          {t(`appConfig.${reason}.title`)}
        </Text>
        <Text style={styles.body}>{t(`appConfig.${reason}.body`)}</Text>
        <ActionButton label={checkAgain} onPress={onCheckAgain} busy={isChecking} />
      </ScrollView>
    </SafeAreaView>
  );
};

const useStyles = createThemedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", padding: theme.spacing.medium },
  title: { ...textStyle("screen-title", "bold"), color: colors.foreground },
  body: { marginTop: theme.spacing.medium, ...textStyle("body", "medium"), color: colors["muted-foreground"] },
}));

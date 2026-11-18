import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionButton } from "@/components/ActionButton";
import { textStyle, titleScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

type Reason = "updateRequired" | "maintenance";

type BlockedScreenProps = {
  reason: Reason;
  onCheckAgain: () => void;
  isChecking: boolean;
};

export const BlockedScreen = ({
  reason,
  onCheckAgain,
  isChecking,
}: BlockedScreenProps) => {
  const styles = useStyles();
  const { t } = useTranslation();
  const checkAgain = t("appConfig.checkAgain");

  return (
    <SafeAreaView testID="blocked-screen" style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.copy}>
          <Text role="heading" {...titleScale} style={styles.title}>
            {t(`appConfig.${reason}.title`)}
          </Text>
          <Text style={styles.body}>{t(`appConfig.${reason}.body`)}</Text>
        </View>
        <ActionButton label={checkAgain} onPress={onCheckAgain} busy={isChecking} />
      </ScrollView>
    </SafeAreaView>
  );
};

const useStyles = createThemedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", gap: theme.spacing.large, padding: theme.spacing.medium },
  copy: { gap: theme.spacing.medium },
  title: { ...textStyle("screen-title", "bold"), color: colors.foreground },
  body: { ...textStyle("body", "medium"), color: colors["muted-foreground"] },
}));

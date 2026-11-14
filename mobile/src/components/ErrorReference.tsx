import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { isApiError } from "@kalia/api";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";

export const ErrorReference = ({ error }: { error: unknown }) => {
  const styles = useStyles();
  const { t } = useTranslation();
  if (!isApiError(error) || !error.traceId) {
    return null;
  }
  return (
    <Text selectable style={styles.reference}>
      {t("error.reference", { id: error.traceId })}
    </Text>
  );
};

const useStyles = createThemedStyles((colors) => ({
  reference: { marginTop: theme.spacing.small, ...textStyle("label", "normal"), color: colors["muted-foreground"] },
}));

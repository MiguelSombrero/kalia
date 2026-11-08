import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { isApiError } from "@kalia/api";
import { StyleSheet, Text } from "react-native";
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

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    reference: { marginTop: theme.spacing.small, fontSize: theme.typography.label.size, color: colors["muted-foreground"] },
  });
};

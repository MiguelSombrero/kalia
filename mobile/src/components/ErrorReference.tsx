import { isApiError } from "@kalia/api";
import { useTranslation } from "react-i18next";
import { Text } from "react-native";

import { textStyle } from "@/lib/design/fonts";
import { createThemedStyles } from "@/lib/design/themedStyles";

type ErrorReferenceProps = { error: unknown };

export const ErrorReference = ({ error }: ErrorReferenceProps) => {
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
  reference: { ...textStyle("label", "normal"), color: colors["muted-foreground"] },
}));

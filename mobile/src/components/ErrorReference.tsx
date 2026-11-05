import { isApiError } from "@kalia/api";
import { StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";

export const ErrorReference = ({ error }: { error: unknown }) => {
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

const styles = StyleSheet.create({
  reference: { marginTop: 8, fontSize: 13, color: "#444444" },
});

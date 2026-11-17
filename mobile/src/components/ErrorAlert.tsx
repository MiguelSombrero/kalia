import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useAnnounce } from "@/lib/a11y/useAnnounce";

import { ActionButton } from "./ActionButton";
import { BodyText } from "./BodyText";
import { ErrorReference } from "./ErrorReference";
import { spacing } from "./metrics";

type ErrorAlertProps = { message: string; error: unknown; onRetry: () => void; retrying?: boolean };

export const ErrorAlert = ({ message, error, onRetry, retrying = false }: ErrorAlertProps) => {
  const { t } = useTranslation();
  useAnnounce(message);
  return (
    <View style={spacing.blocks}>
      <View style={spacing.tight}>
        <BodyText tone="error">{message}</BodyText>
        <ErrorReference error={error} />
      </View>
      <ActionButton label={t("error.retry")} onPress={onRetry} busy={retrying} />
    </View>
  );
};

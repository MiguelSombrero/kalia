import { useTranslation } from "react-i18next";
import { ActionButton } from "./ActionButton";
import { BodyText } from "./BodyText";
import { ErrorReference } from "./ErrorReference";

export const ErrorAlert = ({ message, error, onRetry, retrying = false, spaced = false }: { message: string; error: unknown; onRetry: () => void; retrying?: boolean; spaced?: boolean }) => {
  const { t } = useTranslation();
  return (
    <>
      <BodyText tone="error" spaced={spaced}>
        {message}
      </BodyText>
      <ErrorReference error={error} />
      <ActionButton label={t("error.retry")} onPress={onRetry} busy={retrying} />
    </>
  );
};

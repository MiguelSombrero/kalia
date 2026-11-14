import { useTranslation } from "react-i18next";
import { ActionButton } from "./ActionButton";
import { BodyText } from "./BodyText";
import { Screen } from "./Screen";
import { ScreenTitle } from "./ScreenTitle";

export const ComingSoon = ({ heading, onBrowse }: { heading: string; onBrowse?: () => void }) => {
  const { t } = useTranslation();

  return (
    <Screen>
      <ScreenTitle>{heading}</ScreenTitle>
      <BodyText tone="muted">{t("placeholder.comingSoon")}</BodyText>
      {onBrowse ? <ActionButton label={t("mobileNavigation.browse")} onPress={onBrowse} /> : null}
    </Screen>
  );
};

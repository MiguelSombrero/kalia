import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { ActionButton } from "./ActionButton";
import { BodyText } from "./BodyText";
import { spacing } from "./metrics";
import { Screen } from "./Screen";
import { ScreenTitle } from "./ScreenTitle";

type ComingSoonProps = { heading: string; onBrowse?: () => void };

export const ComingSoon = ({ heading, onBrowse }: ComingSoonProps) => {
  const { t } = useTranslation();

  return (
    <Screen>
      <View style={spacing.blocks}>
        <View>
          <ScreenTitle>{heading}</ScreenTitle>
          <BodyText tone="muted">{t("placeholder.comingSoon")}</BodyText>
        </View>
        {onBrowse ? <ActionButton label={t("mobileNavigation.browse")} onPress={onBrowse} /> : null}
      </View>
    </Screen>
  );
};

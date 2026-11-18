import { useTranslation } from "react-i18next";
import { Text } from "react-native";

import { ownBuildNumber, ownVersion } from "@/lib/build/buildInfo";
import { textStyle } from "@/lib/design/fonts";
import { createThemedStyles } from "@/lib/design/themedStyles";

export const BuildInfo = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const version = ownVersion();
  const build = ownBuildNumber();
  if (version === null) {
    return null;
  }
  return <Text style={styles.build}>{build === null ? t("profile.about.version", { version }) : t("profile.about.versionBuild", { version, build })}</Text>;
};

const useStyles = createThemedStyles((colors) => ({
  build: { ...textStyle("supporting", "normal"), color: colors["muted-foreground"] },
}));

import { StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { ownBuildNumber, ownVersion } from "@/lib/build/buildInfo";

export const BuildInfo = () => {
  const { t } = useTranslation();
  const version = ownVersion();
  const build = ownBuildNumber();
  if (version === null) {
    return null;
  }
  return <Text style={styles.build}>{build === null ? t("profile.about.version", { version }) : t("profile.about.versionBuild", { version, build })}</Text>;
};

const styles = StyleSheet.create({
  build: { marginTop: 32, fontSize: 15, color: "#444444" },
});

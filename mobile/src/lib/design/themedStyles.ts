import { StyleSheet } from "react-native";
import { theme } from "./theme.generated";
import { useColorMode, type ThemeColors } from "./useThemeColors";

export const createThemedStyles = <T extends Parameters<typeof StyleSheet.create>[0]>(build: (colors: ThemeColors) => T) => {
  const sheets = {
    light: StyleSheet.create(build(theme.colors.light)),
    dark: StyleSheet.create(build(theme.colors.dark)),
  };
  return () => sheets[useColorMode()];
};

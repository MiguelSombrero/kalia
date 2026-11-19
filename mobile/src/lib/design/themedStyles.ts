import { StyleSheet } from "react-native";

import { facesKey } from "./fonts";
import { theme } from "./theme.generated";
import { type ThemeColors, useColorMode } from "./useThemeColors";

// Built on first render, per mode and settled face: `textStyle` must not run before the faces settle.
export const createThemedStyles = <T extends Parameters<typeof StyleSheet.create>[0]>(build: (colors: ThemeColors) => T) => {
  const sheets = new Map<string, ReturnType<typeof StyleSheet.create<T>>>();
  return () => {
    const mode = useColorMode();
    const key = `${mode}:${facesKey()}`;
    let sheet = sheets.get(key);
    if (!sheet) {
      sheet = StyleSheet.create(build(theme.colors[mode]));
      sheets.set(key, sheet);
    }
    return sheet;
  };
};

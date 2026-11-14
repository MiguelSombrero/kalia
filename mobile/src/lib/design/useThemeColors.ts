import { useColorScheme } from "react-native";
import { theme } from "./theme.generated";

export type ThemeColors = (typeof theme.colors)[keyof typeof theme.colors];

export const useColorMode = () => (useColorScheme() === "dark" ? "dark" : "light");

export const useThemeColors = (): ThemeColors => theme.colors[useColorMode()];

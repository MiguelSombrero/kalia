import { useColorScheme } from "react-native";
import { theme } from "./theme.generated";

export const useColorMode = () => (useColorScheme() === "dark" ? "dark" : "light");

export const useThemeColors = () => theme.colors[useColorMode()];

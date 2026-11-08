import { useColorScheme } from "react-native";
import { theme } from "./theme.generated";

export const useThemeColors = () => theme.colors[useColorScheme() === "dark" ? "dark" : "light"];

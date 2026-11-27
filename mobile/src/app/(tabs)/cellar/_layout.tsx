import { Stack } from "expo-router";

import { useThemeColors } from "@/lib/design/useThemeColors";
import { useReducedMotion } from "@/lib/motion/reducedMotion";

export const unstable_settings = { anchor: "index" };

const CellarLayout = () => {
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  return <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? "fade" : "default", contentStyle: { backgroundColor: colors.background } }} />;
};

export default CellarLayout;

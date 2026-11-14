import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";

type Tone = "default" | "muted" | "error";

export const BodyText = ({ children, tone = "default", spaced = false }: { children: ReactNode; tone?: Tone; spaced?: boolean }) => {
  const colors = useThemeColors();
  const styles = StyleSheet.create({
    text: { ...textStyle("body", "normal"), color: tone === "muted" ? colors["muted-foreground"] : tone === "error" ? colors.destructive : colors.foreground },
    spaced: { marginTop: theme.spacing.medium },
  });
  return <Text style={[styles.text, spaced && styles.spaced]}>{children}</Text>;
};

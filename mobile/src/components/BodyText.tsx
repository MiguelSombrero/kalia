import type { ReactNode } from "react";
import { Text } from "react-native";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

type Tone = "default" | "muted" | "error";

export const BodyText = ({ children, tone = "default", spaced = false }: { children: ReactNode; tone?: Tone; spaced?: boolean }) => {
  const styles = useStyles();
  return <Text style={[styles.text, tone !== "default" && styles[tone], spaced && styles.spaced]}>{children}</Text>;
};

const useStyles = createThemedStyles((colors) => ({
  text: { ...textStyle("body", "normal"), color: colors.foreground },
  muted: { color: colors["muted-foreground"] },
  error: { color: colors.destructive },
  spaced: { marginTop: theme.spacing.medium },
}));

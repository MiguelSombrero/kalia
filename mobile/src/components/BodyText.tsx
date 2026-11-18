import type { ReactNode } from "react";
import { Text } from "react-native";

import { textStyle } from "@/lib/design/fonts";
import { createThemedStyles } from "@/lib/design/themedStyles";

type Tone = "default" | "muted" | "error";

type BodyTextProps = { children: ReactNode; tone?: Tone };

export const BodyText = ({ children, tone = "default" }: BodyTextProps) => {
  const styles = useStyles();
  return <Text style={[styles.text, tone !== "default" && styles[tone]]}>{children}</Text>;
};

const useStyles = createThemedStyles((colors) => ({
  text: { ...textStyle("body", "normal"), color: colors.foreground },
  muted: { color: colors["muted-foreground"] },
  error: { color: colors.destructive },
}));

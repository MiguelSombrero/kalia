import { Text } from "react-native";

import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { PressFeedback } from "@/lib/motion/PressFeedback";

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  maxFontSizeMultiplier?: number;
  testID?: string;
  variant?: "primary" | "secondary";
};

export const ActionButton = ({
  label,
  onPress,
  busy = false,
  disabled = false,
  maxFontSizeMultiplier,
  testID,
  variant = "primary",
}: ActionButtonProps) => {
  const styles = useStyles();
  const inert = busy || disabled;
  return (
    <PressFeedback
      role="button"
      testID={testID}
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: inert }}
      disabled={inert}
      onPress={onPress}
      style={[styles.button, variant === "secondary" ? styles.secondary : styles.primary, inert && styles.buttonBusy]}
    >
      <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={[styles.buttonText, variant === "secondary" && styles.secondaryText]}>{label}</Text>
    </PressFeedback>
  );
};

const useStyles = createThemedStyles((colors) => ({
  button: {
    minHeight: theme.spacing.action,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.large,
    borderRadius: theme.radius.card,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background },
  buttonBusy: { opacity: 0.5 },
  buttonText: { ...textStyle("body", "bold"), textAlign: "center", color: colors["primary-foreground"] },
  secondaryText: { color: colors.foreground },
}));

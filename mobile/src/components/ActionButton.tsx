import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { StyleSheet, Text } from "react-native";
import { PressFeedback } from "@/lib/motion";

export const ActionButton = ({
  label,
  onPress,
  busy = false,
  disabled = false,
  flush = false,
  maxFontSizeMultiplier,
  testID,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  flush?: boolean;
  maxFontSizeMultiplier?: number;
  testID?: string;
  variant?: "primary" | "secondary";
}) => {
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
      style={[styles.button, !flush && styles.buttonSpaced, variant === "secondary" ? styles.secondary : styles.primary, inert && styles.buttonBusy]}
    >
      <Text maxFontSizeMultiplier={maxFontSizeMultiplier} style={[styles.buttonText, variant === "secondary" && styles.secondaryText]}>{label}</Text>
    </PressFeedback>
  );
};

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    button: {
      minHeight: theme.spacing.action,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.large,
      borderRadius: theme.radius.card,
    },
    buttonSpaced: { marginTop: theme.spacing.large },
    primary: { backgroundColor: colors.primary },
    secondary: { borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background },
    buttonBusy: { opacity: 0.5 },
    buttonText: { ...textStyle("body", "bold"), textAlign: "center", color: colors["primary-foreground"] },
    secondaryText: { color: colors.foreground },
  });
};

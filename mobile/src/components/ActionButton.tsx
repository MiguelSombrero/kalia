import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { Pressable, StyleSheet, Text } from "react-native";

export const ActionButton = ({
  label,
  onPress,
  busy = false,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  variant?: "primary" | "secondary";
}) => {
  const styles = useStyles();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.button, variant === "secondary" ? styles.secondary : styles.primary, busy && styles.buttonBusy]}
    >
      <Text style={[styles.buttonText, variant === "secondary" && styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
};

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    button: {
      marginTop: theme.spacing.large,
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
  });
};

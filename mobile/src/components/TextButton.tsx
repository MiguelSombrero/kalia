import { Pressable, StyleSheet, Text } from "react-native";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";

export const TextButton = ({ label, onPress, accessibilityLabel, disabled = false }: { label: string; onPress: () => void; accessibilityLabel?: string; disabled?: boolean }) => {
  const colors = useThemeColors();
  const styles = StyleSheet.create({
    button: { minHeight: theme.spacing.touch, paddingHorizontal: theme.spacing.small, justifyContent: "center" },
    inert: { opacity: 0.5 },
    label: { ...textStyle("supporting", "bold"), color: colors.primary },
  });
  return (
    <Pressable role="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.inert]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

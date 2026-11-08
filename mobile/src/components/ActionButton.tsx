import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { Pressable, StyleSheet, Text } from "react-native";

export const ActionButton = ({ label, onPress, busy = false }: { label: string; onPress: () => void; busy?: boolean }) => {
  const styles = useStyles();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.button, busy && styles.buttonBusy]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
};

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    button: {
      alignSelf: "flex-start",
      marginTop: theme.spacing.large,
      minHeight: theme.spacing.touch,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.large,
      borderRadius: theme.radius.control,
      backgroundColor: colors.foreground,
    },
    buttonBusy: { opacity: 0.5 },
    buttonText: { fontSize: theme.typography.body.size, fontWeight: theme.weights.semibold, color: colors.background },
  });
};

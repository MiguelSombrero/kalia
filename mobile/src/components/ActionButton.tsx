import { Pressable, StyleSheet, Text } from "react-native";

export const ActionButton = ({ label, onPress, busy = false }: { label: string; onPress: () => void; busy?: boolean }) => (
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

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    marginTop: 24,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#111111",
  },
  buttonBusy: { opacity: 0.5 },
  buttonText: { fontSize: 17, fontWeight: "600", color: "#ffffff" },
});

import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { PressFeedback } from "@/lib/motion";
import { EDGE } from "./metrics";

export const FieldRow = ({ title, value, empty, onPress, leading, accessibilityLabel }: { title: string; value: string; empty: boolean; onPress: () => void; leading?: ReactNode; accessibilityLabel: string }) => {
  const colors = useThemeColors();
  const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.tight, minHeight: theme.spacing.touch + theme.spacing.small, paddingVertical: theme.spacing.small, paddingHorizontal: theme.spacing.tight, marginBottom: theme.spacing.small, borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, backgroundColor: colors.surface },
    text: { flex: 1 },
    title: { ...textStyle("label", "bold"), textTransform: "uppercase", color: colors["muted-foreground"] },
    value: { ...textStyle("body", empty ? "normal" : "bold"), color: empty ? colors["muted-foreground"] : colors.foreground },
    chevron: { ...textStyle("body", "bold"), color: colors.foreground },
  });
  return (
    <PressFeedback role="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {leading}
      <Text importantForAccessibility="no" style={styles.chevron}>
        ›
      </Text>
    </PressFeedback>
  );
};

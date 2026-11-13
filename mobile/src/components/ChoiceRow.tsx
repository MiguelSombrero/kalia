import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { EDGE } from "./metrics";

const CHECK_SIZE = 26;

// iOS has no radio trait: React Native fakes one by appending "radio button" and "checked" or "unchecked" to the
// row's value, in its own translation table, which VoiceOver can speak in a voice of another language. Button plus
// selected are traits iOS itself speaks in the voice's language. Android's radio role is announced by TalkBack.
const choiceSemantics = (selected: boolean) =>
  Platform.OS === "ios" ? ({ role: "button", accessibilityState: { selected } } as const) : ({ role: "radio", accessibilityState: { checked: selected } } as const);

export const ChoiceRow = ({ label, sub, selected, onPress, leading, bordered }: { label: string; sub?: string; selected: boolean; onPress: () => void; leading?: ReactNode; bordered?: boolean }) => {
  const colors = useThemeColors();
  const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.tight, minHeight: theme.spacing.touch + theme.spacing.small, paddingVertical: theme.spacing.small, paddingHorizontal: theme.spacing.tight, backgroundColor: selected ? colors.accent : "transparent", ...(bordered ? { borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, marginBottom: theme.spacing.small } : { borderBottomWidth: 1, borderBottomColor: colors.divider }) },
    text: { flex: 1 },
    label: { ...textStyle("body", selected ? "bold" : "medium"), color: selected ? colors["accent-foreground"] : colors.foreground },
    sub: { ...textStyle("supporting", "medium"), color: colors["muted-foreground"] },
    check: { minWidth: CHECK_SIZE, aspectRatio: 1, borderRadius: CHECK_SIZE / 2, borderWidth: EDGE, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.foreground : "transparent" },
    tick: { ...textStyle("supporting", "bold"), color: colors.background },
  });
  return (
    <Pressable {...choiceSemantics(selected)} accessibilityLabel={sub ? `${label}, ${sub}` : label} onPress={onPress} style={styles.row}>
      {leading}
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      <View style={styles.check}>{selected ? <Text style={styles.tick}>✓</Text> : null}</View>
    </Pressable>
  );
};

import type { ReactNode } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { EDGE } from "./metrics";

const CHECK_SIZE = 26;

// iOS has no radio trait: React Native fakes one by appending "radio button" and "checked" or "unchecked" to the
// row's value, in its own translation table, which VoiceOver can speak in a voice of another language. Button plus
// selected are traits iOS itself speaks in the voice's language. Android's radio role is announced by TalkBack.
const choiceSemantics = (selected: boolean) =>
  Platform.OS === "ios" ? ({ role: "button", accessibilityState: { selected } } as const) : ({ role: "radio", accessibilityState: { checked: selected } } as const);

export const ChoiceRow = ({ label, sub, selected, onPress, leading, bordered }: { label: string; sub?: string; selected: boolean; onPress: () => void; leading?: ReactNode; bordered?: boolean }) => {
  const styles = useStyles();
  return (
    <Pressable {...choiceSemantics(selected)} accessibilityLabel={sub ? `${label}, ${sub}` : label} onPress={onPress} style={[styles.row, bordered ? styles.bordered : styles.ruled, selected && styles.rowSelected]}>
      {leading}
      <View style={styles.text}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}>{selected ? <Text style={styles.tick}>✓</Text> : null}</View>
    </Pressable>
  );
};

const useStyles = createThemedStyles((colors) => ({
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.tight, minHeight: theme.spacing.touch + theme.spacing.small, paddingVertical: theme.spacing.small, paddingHorizontal: theme.spacing.tight, backgroundColor: "transparent" },
  bordered: { borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, marginBottom: theme.spacing.small },
  ruled: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowSelected: { backgroundColor: colors.accent },
  text: { flex: 1 },
  label: { ...textStyle("body", "medium"), color: colors.foreground },
  labelSelected: { ...textStyle("body", "bold"), color: colors["accent-foreground"] },
  sub: { ...textStyle("supporting", "medium"), color: colors["muted-foreground"] },
  check: { minWidth: CHECK_SIZE, aspectRatio: 1, borderRadius: CHECK_SIZE / 2, borderWidth: EDGE, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  checkSelected: { backgroundColor: colors.foreground },
  tick: { ...textStyle("supporting", "bold"), color: colors.background },
}));

import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useBeerStyleColours } from "@/lib/design/beerStyleColours";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useColorMode, useThemeColors } from "@/lib/design/useThemeColors";
import { PressFeedback } from "@/lib/motion";
import { MAX_FILTER_LENGTH } from "./model";

const BADGE_SIZE = 22;
const SWATCH_SIZE = 22;
const CHECK_SIZE = 26;
const KNOB_SIZE = 9;
const EDGE = 1.5;
const square = (size: number) => ({ width: size, aspectRatio: 1 }) as const;

export const StyleSwatch = ({ style }: { style: string }) => {
  const colors = useThemeColors();
  const { background } = useBeerStyleColours()(style);
  return <View style={{ ...square(SWATCH_SIZE), borderRadius: theme.spacing.small - 1, backgroundColor: background, borderWidth: 1, borderColor: colors.border }} />;
};

export const SearchField = ({ value, onChange, label, placeholder, clearLabel, onSubmit }: { value: string; onChange: (text: string) => void; label: string; placeholder: string; clearLabel: string; onSubmit?: () => void }) => {
  const colors = useThemeColors();
  const styles = StyleSheet.create({
    field: { flex: 1, flexDirection: "row", alignItems: "center", minHeight: theme.spacing.touch, borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, backgroundColor: colors.surface, paddingLeft: theme.spacing.medium },
    input: { flexGrow: 1, flexShrink: 1, ...textStyle("body", "medium"), color: colors.foreground, paddingVertical: theme.spacing.small },
    clear: { minWidth: theme.spacing.touch, minHeight: theme.spacing.touch, alignItems: "center", justifyContent: "center" },
    clearText: { ...textStyle("body", "bold"), color: colors["muted-foreground"] },
  });
  return (
    <View style={styles.field}>
      <TextInput
        role="searchbox"
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={colors["muted-foreground"]}
        value={value}
        onChangeText={onChange}
        maxLength={MAX_FILTER_LENGTH}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoCorrect={false}
        autoCapitalize="none"
        style={styles.input}
      />
      {value ? (
        <Pressable role="button" accessibilityLabel={clearLabel} onPress={() => onChange("")} style={styles.clear}>
          <Text style={styles.clearText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const SlidersGlyph = () => {
  const colors = useThemeColors();
  const line = { borderTopWidth: 2, borderColor: colors.foreground } as const;
  const knob = { position: "absolute", ...square(KNOB_SIZE), borderRadius: KNOB_SIZE / 2, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.foreground } as const;
  return (
    <View importantForAccessibility="no-hide-descendants" style={{ width: 24, aspectRatio: 24 / 20, justifyContent: "space-between", paddingVertical: theme.spacing.small / 2 }}>
      <View style={line} />
      <View style={line} />
      <View style={[knob, { top: 0, right: 3 }]} />
      <View style={[knob, { bottom: 0, left: 3 }]} />
    </View>
  );
};

export const FiltersButton = ({ count, label, onPress }: { count: number; label: string; onPress: () => void }) => {
  const colors = useThemeColors();
  const styles = StyleSheet.create({
    button: { minWidth: theme.spacing.touch, minHeight: theme.spacing.touch, alignItems: "center", justifyContent: "center", paddingHorizontal: theme.spacing.tight, borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, backgroundColor: colors.surface },
    badge: { position: "absolute", top: -theme.spacing.small, right: -theme.spacing.small, minWidth: BADGE_SIZE, paddingHorizontal: theme.spacing.small - 2, borderRadius: BADGE_SIZE / 2, backgroundColor: colors.foreground, alignItems: "center" },
    badgeText: { ...textStyle("supporting", "bold"), color: colors.background },
  });
  return (
    <PressFeedback role="button" accessibilityLabel={label} onPress={onPress} style={styles.button}>
      <SlidersGlyph />
      {count > 0 ? (
        <View style={styles.badge} importantForAccessibility="no-hide-descendants">
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </PressFeedback>
  );
};

export const TextButton = ({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) => {
  const colors = useThemeColors();
  return (
    <Pressable role="button" accessibilityLabel={accessibilityLabel ?? label} onPress={onPress} style={{ minHeight: theme.spacing.touch, paddingHorizontal: theme.spacing.small, justifyContent: "center" }}>
      <Text style={{ ...textStyle("supporting", "bold"), color: colors.primary }}>{label}</Text>
    </Pressable>
  );
};

export const Chip = ({ label, removeLabel, onPress, style }: { label: string; removeLabel: string; onPress: () => void; style?: string }) => {
  const colors = useThemeColors();
  const dark = useColorMode() === "dark";
  const { background, foreground } = useBeerStyleColours()(style ?? "");
  const coloured = style !== undefined && !dark;
  const ink = coloured ? foreground : colors.foreground;
  const styles = StyleSheet.create({
    chip: { flexDirection: "row", alignItems: "center", gap: theme.spacing.small, minHeight: theme.spacing.touch, maxWidth: "100%", paddingVertical: theme.spacing.small / 2, paddingLeft: theme.spacing.tight, paddingRight: theme.spacing.small, borderWidth: EDGE, borderColor: coloured ? background : colors.border, borderRadius: theme.radius.card, backgroundColor: coloured ? background : colors.surface },
    text: { flexShrink: 1, ...textStyle("supporting", "bold"), color: ink },
    remove: { ...textStyle("supporting", "bold"), color: ink },
    dot: { ...square(theme.spacing.small + 6), borderRadius: theme.spacing.small / 2, backgroundColor: background },
  });
  return (
    <PressFeedback role="button" accessibilityLabel={removeLabel} onPress={onPress} style={styles.chip}>
      {style !== undefined && dark ? <View style={styles.dot} /> : null}
      <Text style={styles.text}>{label}</Text>
      <Text style={styles.remove}>✕</Text>
    </PressFeedback>
  );
};

export const FieldRow = ({ title, value, empty, onPress, swatchStyle, accessibilityLabel }: { title: string; value: string; empty: boolean; onPress: () => void; swatchStyle?: string; accessibilityLabel: string }) => {
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
      {swatchStyle ? <StyleSwatch style={swatchStyle} /> : null}
      <Text importantForAccessibility="no" style={styles.chevron}>
        ›
      </Text>
    </PressFeedback>
  );
};

export const ChoiceRow = ({ label, sub, selected, onPress, swatchStyle, bordered }: { label: string; sub?: string; selected: boolean; onPress: () => void; swatchStyle?: string; bordered?: boolean }) => {
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
    <Pressable role="radio" accessibilityLabel={sub ? `${label}, ${sub}` : label} accessibilityState={{ checked: selected }} onPress={onPress} style={styles.row}>
      {swatchStyle ? <StyleSwatch style={swatchStyle} /> : null}
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      <View style={styles.check}>{selected ? <Text style={styles.tick}>✓</Text> : null}</View>
    </Pressable>
  );
};

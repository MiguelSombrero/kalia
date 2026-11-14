import { Pressable, Text, TextInput, View } from "react-native";
import { useBeerStyleColours } from "@/lib/design/beerStyleColours";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { useColorMode, useThemeColors } from "@/lib/design/useThemeColors";
import { PressFeedback } from "@/lib/motion";
import { EDGE, square } from "@/components/metrics";
import { MAX_FILTER_LENGTH } from "./model";

const BADGE_SIZE = 22;
const SWATCH_SIZE = 22;
const KNOB_SIZE = 9;

export const StyleSwatch = ({ style }: { style: string }) => {
  const styles = useSwatchStyles();
  const { background } = useBeerStyleColours()(style);
  return <View style={[styles.swatch, { backgroundColor: background }]} />;
};

const useSwatchStyles = createThemedStyles((colors) => ({
  swatch: { ...square(SWATCH_SIZE), borderRadius: theme.spacing.small - 1, borderWidth: 1, borderColor: colors.border },
}));

export const SearchField = ({ value, onChange, label, placeholder, clearLabel, onSubmit }: { value: string; onChange: (text: string) => void; label: string; placeholder: string; clearLabel: string; onSubmit?: () => void }) => {
  const colors = useThemeColors();
  const styles = useSearchFieldStyles();
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

const useSearchFieldStyles = createThemedStyles((colors) => ({
  field: { flex: 1, flexDirection: "row", alignItems: "center", minHeight: theme.spacing.touch, borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, backgroundColor: colors.surface, paddingLeft: theme.spacing.medium },
  input: { flexGrow: 1, flexShrink: 1, ...textStyle("body", "medium"), color: colors.foreground, paddingVertical: theme.spacing.small },
  clear: { minWidth: theme.spacing.touch, minHeight: theme.spacing.touch, alignItems: "center", justifyContent: "center" },
  clearText: { ...textStyle("body", "bold"), color: colors["muted-foreground"] },
}));

const SlidersGlyph = () => {
  const styles = useGlyphStyles();
  return (
    <View importantForAccessibility="no-hide-descendants" style={styles.glyph}>
      <View style={styles.line} />
      <View style={styles.line} />
      <View style={[styles.knob, styles.knobTop]} />
      <View style={[styles.knob, styles.knobBottom]} />
    </View>
  );
};

const useGlyphStyles = createThemedStyles((colors) => ({
  glyph: { width: 24, aspectRatio: 24 / 20, justifyContent: "space-between", paddingVertical: theme.spacing.small / 2 },
  line: { borderTopWidth: 2, borderColor: colors.foreground },
  knob: { position: "absolute", ...square(KNOB_SIZE), borderRadius: KNOB_SIZE / 2, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.foreground },
  knobTop: { top: 0, right: 3 },
  knobBottom: { bottom: 0, left: 3 },
}));

export const FiltersButton = ({ count, label, onPress }: { count: number; label: string; onPress: () => void }) => {
  const styles = useFiltersButtonStyles();
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

const useFiltersButtonStyles = createThemedStyles((colors) => ({
  button: { minWidth: theme.spacing.touch, minHeight: theme.spacing.touch, alignItems: "center", justifyContent: "center", paddingHorizontal: theme.spacing.tight, borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, backgroundColor: colors.surface },
  badge: { position: "absolute", top: -theme.spacing.small, right: -theme.spacing.small, minWidth: BADGE_SIZE, paddingHorizontal: theme.spacing.small - 2, borderRadius: BADGE_SIZE / 2, backgroundColor: colors.foreground, alignItems: "center" },
  badgeText: { ...textStyle("supporting", "bold"), color: colors.background },
}));

export const Chip = ({ label, removeLabel, onPress, style }: { label: string; removeLabel: string; onPress: () => void; style?: string }) => {
  const styles = useChipStyles();
  const dark = useColorMode() === "dark";
  const { background, foreground } = useBeerStyleColours()(style ?? "");
  const coloured = style !== undefined && !dark;
  const ink = coloured ? { color: foreground } : null;
  return (
    <PressFeedback role="button" accessibilityLabel={removeLabel} onPress={onPress} style={[styles.chip, coloured && { borderColor: background, backgroundColor: background }]}>
      {style !== undefined && dark ? <View style={[styles.dot, { backgroundColor: background }]} /> : null}
      <Text style={[styles.text, ink]}>{label}</Text>
      <Text style={[styles.remove, ink]}>✕</Text>
    </PressFeedback>
  );
};

const useChipStyles = createThemedStyles((colors) => ({
  chip: { flexDirection: "row", alignItems: "center", gap: theme.spacing.small, minHeight: theme.spacing.touch, maxWidth: "100%", paddingVertical: theme.spacing.small / 2, paddingLeft: theme.spacing.tight, paddingRight: theme.spacing.small, borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, backgroundColor: colors.surface },
  text: { flexShrink: 1, ...textStyle("supporting", "bold"), color: colors.foreground },
  remove: { ...textStyle("supporting", "bold"), color: colors.foreground },
  dot: { ...square(theme.spacing.small + 6), borderRadius: theme.spacing.small / 2 },
}));

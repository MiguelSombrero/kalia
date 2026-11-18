import { View } from "react-native";

import { square } from "@/components/metrics";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

const KNOB_SIZE = 9;

export const SlidersGlyph = () => {
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

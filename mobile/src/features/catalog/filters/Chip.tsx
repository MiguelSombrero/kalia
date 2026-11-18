import { Text, View } from "react-native";

import { EDGE, square } from "@/components/metrics";
import { useBeerStyleColours } from "@/lib/design/beerStyleColours";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { useColorMode } from "@/lib/design/useThemeColors";
import { PressFeedback } from "@/lib/motion/PressFeedback";

type ChipProps = { label: string; removeLabel: string; onPress: () => void; style?: string };

export const Chip = ({ label, removeLabel, onPress, style }: ChipProps) => {
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

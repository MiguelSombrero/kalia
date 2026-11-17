import { Text, View } from "react-native";

import { EDGE } from "@/components/metrics";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { PressFeedback } from "@/lib/motion/PressFeedback";

import { SlidersGlyph } from "./SlidersGlyph";

const BADGE_SIZE = 22;

type FiltersButtonProps = { count: number; label: string; onPress: () => void };

export const FiltersButton = ({ count, label, onPress }: FiltersButtonProps) => {
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

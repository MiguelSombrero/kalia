import { STACK_FROM_FONT_SCALE, textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { useBeerStyleColours } from "@/lib/design/beerStyleColours";
import { useColorMode } from "@/lib/design/useThemeColors";
import { Text, useWindowDimensions, View } from "react-native";
import { BeerSlot, SLAB_WIDTH } from "@/components/BeerSlot";

export const BeerHeadline = ({ name, style, abv, language }: { name: string; style: string; abv: number; language: string }) => {
  const { background, foreground } = useBeerStyleColours()(style);
  const styles = useStyles();
  const dark = useColorMode() === "dark";
  const stacked = useWindowDimensions().fontScale >= STACK_FROM_FONT_SCALE;
  const strength = new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(abv);

  return (
    <View testID="beer-headline" style={[styles.card, stacked && styles.cardStacked, dark ? styles.cardDark : { backgroundColor: background }]}>
      {dark ? <BeerSlot beerStyle={style} /> : null}
      <Text style={[styles.name, stacked ? styles.nameStacked : styles.nameBeside, !dark && { color: foreground }]}>{name}</Text>
      <Text style={[styles.strength, !dark && { color: foreground }]}>
        {strength}
        <Text style={styles.unit}>{" %"}</Text>
      </Text>
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  card: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.small,
    marginBottom: theme.spacing.small,
    paddingVertical: theme.spacing.medium,
    paddingHorizontal: theme.spacing.medium,
    borderRadius: theme.radius.card,
    overflow: "hidden",
  },
  cardDark: { backgroundColor: colors.surface, paddingLeft: theme.spacing.medium + SLAB_WIDTH },
  cardStacked: { flexDirection: "column", alignItems: "flex-start" },
  nameBeside: { flex: 1 },
  nameStacked: { alignSelf: "stretch" },
  name: { ...textStyle("item-title", "bold"), color: colors.foreground },
  strength: { ...textStyle("strength", "bold"), color: colors.foreground },
  unit: textStyle("supporting", "bold"),
}));

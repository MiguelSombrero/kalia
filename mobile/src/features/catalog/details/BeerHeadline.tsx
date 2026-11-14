import { STACK_FROM_FONT_SCALE, textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useBeerStyleColours } from "@/lib/design/beerStyleColours";
import { useColorMode, useThemeColors } from "@/lib/design/useThemeColors";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { BeerSlot, SLAB_WIDTH } from "@/components/BeerSlot";

export const BeerHeadline = ({ name, style, abv, language }: { name: string; style: string; abv: number; language: string }) => {
  const { background, foreground } = useBeerStyleColours()(style);
  const colors = useThemeColors();
  const dark = useColorMode() === "dark";
  const stacked = useWindowDimensions().fontScale >= STACK_FROM_FONT_SCALE;
  const strength = new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(abv);
  const ink = dark ? colors.foreground : foreground;

  return (
    <View testID="beer-headline" style={[styles.card, stacked && styles.cardStacked, { backgroundColor: dark ? colors.surface : background }, dark && styles.cardWithSlab]}>
      {dark ? <BeerSlot beerStyle={style} /> : null}
      <Text style={[styles.name, stacked ? styles.nameStacked : styles.nameBeside, { color: ink }]}>{name}</Text>
      <Text style={[styles.strength, { color: ink }]}>
        {strength}
        <Text style={styles.unit}>{" %"}</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
  cardWithSlab: { paddingLeft: theme.spacing.medium + SLAB_WIDTH },
  cardStacked: { flexDirection: "column", alignItems: "flex-start" },
  nameBeside: { flex: 1 },
  nameStacked: { alignSelf: "stretch" },
  name: textStyle("item-title", "bold"),
  strength: textStyle("strength", "bold"),
  unit: textStyle("supporting", "bold"),
});

import { STACK_FROM_FONT_SCALE, textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useBeerStyleColours } from "@/lib/design/beerStyleColours";
import { contrastRatio, NON_TEXT_CONTRAST } from "@/lib/design/contrast";
import { useColorMode, useThemeColors } from "@/lib/design/useThemeColors";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { BeerSummary } from "./api";

const SLAB_WIDTH = 22;

export const BeerCard = ({ beer, language }: { beer: BeerSummary; language: string }) => {
  const { background, foreground } = useBeerStyleColours()(beer.style);
  const colors = useThemeColors();
  const dark = useColorMode() === "dark";
  const stacked = useWindowDimensions().fontScale >= STACK_FROM_FONT_SCALE;
  const strength = new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(beer.abv);
  const fill = dark ? colors.surface : background;
  const ink = dark ? colors.foreground : foreground;
  const supporting = dark ? colors["muted-foreground"] : foreground;
  const outlined = dark && contrastRatio(background, colors.surface) < NON_TEXT_CONTRAST;

  return (
    <View testID="beer-row" style={[styles.card, stacked && styles.cardStacked, { backgroundColor: fill }, dark && styles.cardWithSlab]}>
      {dark ? <View testID="beer-slab" style={[styles.slab, { backgroundColor: background }, outlined && { borderWidth: 1.5, borderColor: colors.border }]} /> : null}
      <View style={stacked ? styles.textStacked : styles.text}>
        <Text style={[styles.name, { color: ink }]}>{beer.name}</Text>
        <Text style={[styles.brewery, { color: supporting }]}>{beer.brewery.name}</Text>
        <Text style={[styles.style, { color: ink }]}>{beer.style}</Text>
      </View>
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
    paddingVertical: theme.spacing.tight,
    paddingHorizontal: theme.spacing.medium,
    borderRadius: theme.radius.card,
    overflow: "hidden",
  },
  cardWithSlab: { paddingLeft: theme.spacing.medium + SLAB_WIDTH },
  slab: { position: "absolute", left: 0, top: 0, bottom: 0, width: SLAB_WIDTH, borderTopLeftRadius: theme.radius.card, borderBottomLeftRadius: theme.radius.card },
  cardStacked: { flexDirection: "column", alignItems: "flex-start" },
  text: { flex: 1 },
  textStacked: { alignSelf: "stretch" },
  name: textStyle("item-title", "bold"),
  brewery: textStyle("supporting", "medium"),
  style: { ...textStyle("label", "bold"), marginTop: theme.spacing.small, textTransform: "uppercase" },
  strength: textStyle("strength", "bold"),
  unit: textStyle("supporting", "bold"),
});

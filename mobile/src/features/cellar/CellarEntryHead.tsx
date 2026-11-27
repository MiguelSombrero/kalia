import { useTranslation } from "react-i18next";
import { Text, useWindowDimensions, View } from "react-native";

import { BeerSlot, SLAB_WIDTH } from "@/components/BeerSlot";
import { useBeerStyleColours } from "@/lib/design/beerStyleColours";
import { STACK_FROM_FONT_SCALE, textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { useColorMode, useThemeColors } from "@/lib/design/useThemeColors";

import type { CellarEntry } from "./types";

type CellarEntryHeadProps = { entry: CellarEntry; language: string };

export const CellarEntryHead = ({ entry, language }: CellarEntryHeadProps) => {
  const styles = useStyles();
  const { t } = useTranslation();
  const { beer } = entry;
  const { background, foreground } = useBeerStyleColours()(beer.style);
  const colors = useThemeColors();
  const dark = useColorMode() === "dark";
  const stacked = useWindowDimensions().fontScale >= STACK_FROM_FONT_SCALE;
  const strength = new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(beer.abv);
  const ink = dark ? colors.foreground : foreground;
  const supporting = dark ? colors["muted-foreground"] : foreground;

  return (
    <View testID="cellar-entry-head" style={[styles.card, stacked && styles.cardStacked, { backgroundColor: dark ? colors.surface : background }, dark && styles.cardWithSlab]}>
      {dark ? <BeerSlot beerStyle={beer.style} /> : null}
      <View style={stacked ? styles.textStacked : styles.text}>
        <Text role="heading" style={[styles.name, { color: ink }]}>{beer.name}</Text>
        <Text style={[styles.brewery, { color: supporting }]}>{beer.brewery}</Text>
        <Text style={[styles.style, { color: ink }]}>{beer.style}</Text>
        {entry.withdrawn ? <Text style={[styles.tag, { color: ink, borderColor: ink }]}>{t("cellarList.withdrawn")}</Text> : null}
      </View>
      <Text style={[styles.strength, { color: ink }]}>
        {strength}
        <Text style={styles.unit}>{" %"}</Text>
      </Text>
    </View>
  );
};

const useStyles = createThemedStyles(() => ({
  card: { flexDirection: "row", alignItems: "flex-end", gap: theme.spacing.small, paddingVertical: theme.spacing.medium, paddingHorizontal: theme.spacing.medium, borderRadius: theme.radius.card, overflow: "hidden" },
  cardWithSlab: { paddingLeft: theme.spacing.medium + SLAB_WIDTH },
  cardStacked: { flexDirection: "column", alignItems: "flex-start" },
  // token-exception: lets the name column shrink below its longest line, so a long name wraps instead of pushing the strength off the card.
  text: { flex: 1, minWidth: 0 },
  textStacked: { alignSelf: "stretch" },
  name: textStyle("item-title", "bold"),
  brewery: textStyle("supporting", "medium"),
  style: { ...textStyle("label", "bold"), marginTop: theme.spacing.small, textTransform: "uppercase" },
  tag: { ...textStyle("label", "bold"), alignSelf: "flex-start", marginTop: theme.spacing.small, paddingHorizontal: theme.spacing.small, borderWidth: 1, borderRadius: theme.radius.card },
  strength: { ...textStyle("strength", "bold"), flexShrink: 0 },
  unit: textStyle("supporting", "bold"),
}));

import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { PressFeedback } from "@/lib/motion";
import { EDGE } from "@/components/metrics";
import type { BeerSummary } from "../api";
import { StyleSwatch } from "../filters/controls";

export const SimilarBeers = ({ beers, language, onOpen }: { beers: BeerSummary[]; language: string; onOpen: (id: string) => void }) => {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text role="heading" style={styles.heading}>
        {t("beerDetails.similar")}
      </Text>
      {beers.map((beer) => {
        const strength = `${new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(beer.abv)} %`;
        return (
          <PressFeedback key={beer.id} testID="similar-beer" role="button" accessibilityLabel={`${beer.name}, ${beer.brewery.name}, ${strength}`} onPress={() => onOpen(beer.id)} style={styles.row}>
            <StyleSwatch style={beer.style} />
            <View style={styles.text}>
              <Text style={styles.name}>{beer.name}</Text>
              <Text style={styles.brewery}>{beer.brewery.name}</Text>
            </View>
            <Text style={styles.strength}>{strength}</Text>
          </PressFeedback>
        );
      })}
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  section: { marginTop: theme.spacing.large },
  heading: { ...textStyle("label", "bold"), textTransform: "uppercase", color: colors["muted-foreground"], marginBottom: theme.spacing.small },
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.tight, minHeight: theme.spacing.touch + theme.spacing.small, paddingVertical: theme.spacing.small, paddingHorizontal: theme.spacing.tight, marginBottom: theme.spacing.small, borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, backgroundColor: colors.surface },
  text: { flex: 1 },
  name: { ...textStyle("body", "bold"), color: colors.foreground },
  brewery: { ...textStyle("supporting", "medium"), color: colors["muted-foreground"] },
  strength: { ...textStyle("body", "bold"), color: colors.foreground },
}));

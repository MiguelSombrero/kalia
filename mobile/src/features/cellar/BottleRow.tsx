import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

import { containerLabelKey, formatBottleDate, isPastBestBefore, vintageOf } from "./bottles";
import { ContainerIcon } from "./ContainerIcon";
import { PastBestBeforeTag } from "./PastBestBeforeTag";
import type { Bottle } from "./types";

type BottleRowProps = { bottle: Bottle; today: string; language: string };

export const BottleRow = ({ bottle, today, language }: BottleRowProps) => {
  const styles = useStyles();
  const { t } = useTranslation();
  const container = t(containerLabelKey(bottle.containerType));
  const vintage = vintageOf(bottle);
  const past = isPastBestBefore(bottle, today);
  const bestBefore = bottle.bestBeforeDate ? t("cellar.bottle.bestBeforeOn", { date: formatBottleDate(bottle.bestBeforeDate, language) }) : t("cellarEntry.bestBeforeMissing");
  const brewed = bottle.brewedDate ? t("cellarEntry.brewedOn", { date: formatBottleDate(bottle.brewedDate, language) }) : t("cellarEntry.brewedMissing");
  const spoken = [container, vintage ? `${t("cellar.bottle.vintage")} ${vintage}` : t("cellar.bottle.vintageUnknown"), bestBefore, past ? t("cellar.bottle.pastBestBefore") : null, brewed].filter(Boolean).join(", ");

  return (
    <View testID="bottle-row" accessible role="listitem" accessibilityLabel={spoken} style={styles.row}>
      <ContainerIcon container={bottle.containerType} />
      <View style={styles.text}>
        {vintage ? <Text style={styles.vintage}>{vintage}</Text> : <Text style={styles.unknown}>{t("cellar.bottle.vintageUnknown")}</Text>}
        <Text style={bottle.bestBeforeDate ? styles.date : styles.missing}>{bestBefore}</Text>
        {past ? <PastBestBeforeTag /> : null}
        <Text style={bottle.brewedDate ? styles.date : styles.missing}>{brewed}</Text>
      </View>
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.medium, paddingVertical: theme.spacing.small, minHeight: theme.spacing.touch + theme.spacing.small, borderBottomWidth: 1, borderBottomColor: colors.divider },
  // token-exception: lets the text column shrink below its longest line, so a long Finnish date line wraps instead of widening the row.
  text: { flex: 1, minWidth: 0, gap: 2 },
  vintage: { ...textStyle("item-title", "bold"), color: colors.foreground },
  unknown: { ...textStyle("body", "medium"), color: colors["muted-foreground"] },
  date: { ...textStyle("supporting", "medium"), color: colors.foreground },
  missing: { ...textStyle("supporting", "medium"), color: colors["muted-foreground"] },
}));

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { choicePlace, choiceSemantics } from "@/lib/a11y/choiceSemantics";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

import { EDGE } from "./metrics";

const CHECK_SIZE = 26;

type ChoiceRowProps = { label: string; sub?: string; selected: boolean; onPress: () => void; leading?: ReactNode; bordered?: boolean; position: { index: number; count: number } };

export const ChoiceRow = ({ label, sub, selected, onPress, leading, bordered, position }: ChoiceRowProps) => {
  const styles = useStyles();
  const { t } = useTranslation();
  const place = choicePlace(t("a11y.positionInSet", { position: position.index, total: position.count }));
  return (
    <Pressable {...choiceSemantics(selected)} {...place} accessibilityLabel={sub ? `${label}, ${sub}` : label} onPress={onPress} style={[styles.row, bordered ? styles.bordered : styles.ruled, selected && styles.rowSelected]}>
      {leading}
      <View style={styles.text}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}>{selected ? <Text style={styles.tick}>✓</Text> : null}</View>
    </Pressable>
  );
};

const useStyles = createThemedStyles((colors) => ({
  row: { flexDirection: "row", alignItems: "center", gap: theme.spacing.tight, minHeight: theme.spacing.touch + theme.spacing.small, paddingVertical: theme.spacing.small, paddingHorizontal: theme.spacing.tight, backgroundColor: "transparent" },
  bordered: { borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, marginBottom: theme.spacing.small },
  ruled: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowSelected: { backgroundColor: colors.accent },
  text: { flex: 1 },
  label: { ...textStyle("body", "medium"), color: colors.foreground },
  labelSelected: { ...textStyle("body", "bold"), color: colors["accent-foreground"] },
  sub: { ...textStyle("supporting", "medium"), color: colors["muted-foreground"] },
  check: { minWidth: CHECK_SIZE, aspectRatio: 1, borderRadius: CHECK_SIZE / 2, borderWidth: EDGE, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  checkSelected: { backgroundColor: colors.foreground },
  tick: { ...textStyle("supporting", "bold"), color: colors.background },
}));

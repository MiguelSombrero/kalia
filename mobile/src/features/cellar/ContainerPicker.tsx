import { useTranslation } from "react-i18next";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { EDGE } from "@/components/metrics";
import { choicePlace, choiceSemantics } from "@/lib/a11y/choiceSemantics";
import { STACK_FROM_FONT_SCALE, textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

import { containerLabelKey } from "./bottles";
import { ContainerIcon } from "./ContainerIcon";
import { type Bottle, containerTypeValues } from "./types";

const containers = Object.values(containerTypeValues);

type ContainerPickerProps = { label: string; value: Bottle["containerType"]; onChange: (value: Bottle["containerType"]) => void };

export const ContainerPicker = ({ label, value, onChange }: ContainerPickerProps) => {
  const styles = useStyles();
  const { t } = useTranslation();
  const stacked = useWindowDimensions().fontScale >= STACK_FROM_FONT_SCALE;
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View role="radiogroup" accessibilityLabel={label} style={[styles.tiles, stacked && styles.tilesStacked]}>
        {containers.map((container, index) => {
          const selected = container === value;
          const place = choicePlace(t("a11y.positionInSet", { position: index + 1, total: containers.length }));
          const name = t(containerLabelKey(container));
          return (
            <Pressable key={container} {...choiceSemantics(selected)} {...place} accessibilityLabel={name} onPress={() => onChange(container)} style={[styles.tile, stacked && styles.tileStacked, selected && styles.tileSelected]}>
              <ContainerIcon container={container} />
              <Text style={[styles.name, stacked && styles.nameStacked, selected && styles.nameSelected]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  label: { ...textStyle("label", "bold"), textTransform: "uppercase", color: colors["muted-foreground"], marginBottom: theme.spacing.small },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.small },
  tile: { flexGrow: 1, flexBasis: 90, minHeight: theme.spacing.action, padding: theme.spacing.small, alignItems: "center", justifyContent: "center", gap: theme.spacing.small / 2, borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card },
  tilesStacked: { flexDirection: "column", flexWrap: "nowrap" },
  tileStacked: { flexBasis: "auto", flexDirection: "row", justifyContent: "flex-start", gap: theme.spacing.medium },
  tileSelected: { backgroundColor: colors.accent, borderWidth: 3 },
  name: { ...textStyle("supporting", "bold"), textAlign: "center", color: colors.foreground },
  nameStacked: { flexShrink: 1, textAlign: "left" },
  nameSelected: { color: colors["accent-foreground"] },
}));

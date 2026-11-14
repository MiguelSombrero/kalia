import { StyleSheet, View } from "react-native";
import { useBeerStyleColours } from "@/lib/design/beerStyleColours";
import { contrastRatio, NON_TEXT_CONTRAST } from "@/lib/design/contrast";
import { theme } from "@/lib/design/theme.generated";
import { useColorMode, useThemeColors } from "@/lib/design/useThemeColors";
import { EDGE } from "./metrics";

export const SLAB_WIDTH = 22;

export const BeerSlot = ({ beerStyle }: { beerStyle: string }) => {
  const { background } = useBeerStyleColours()(beerStyle);
  const colors = useThemeColors();
  const outlined = useColorMode() === "dark" && contrastRatio(background, colors.surface) < NON_TEXT_CONTRAST;
  const styles = StyleSheet.create({
    slab: { position: "absolute", left: 0, top: 0, bottom: 0, width: SLAB_WIDTH, borderTopLeftRadius: theme.radius.card, borderBottomLeftRadius: theme.radius.card },
    outlined: { borderWidth: EDGE, borderColor: colors.border },
  });
  return <View testID="beer-slab" style={[styles.slab, { backgroundColor: background }, outlined && styles.outlined]} />;
};

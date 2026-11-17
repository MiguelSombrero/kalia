import { View } from "react-native";

import { square } from "@/components/metrics";
import { useBeerStyleColours } from "@/lib/design/beerStyleColours";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

const SWATCH_SIZE = 22;

type StyleSwatchProps = { style: string };

export const StyleSwatch = ({ style }: StyleSwatchProps) => {
  const styles = useSwatchStyles();
  const { background } = useBeerStyleColours()(style);
  return <View style={[styles.swatch, { backgroundColor: background }]} />;
};

const useSwatchStyles = createThemedStyles((colors) => ({
  swatch: { ...square(SWATCH_SIZE), borderRadius: theme.spacing.small - 1, borderWidth: 1, borderColor: colors.border },
}));

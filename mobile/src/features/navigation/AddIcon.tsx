import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { useThemeColors } from "@/lib/design/useThemeColors";

import { ADD_GLYPH, GRID, hidden } from "./tabIcons";

const ADD_STROKE = 2.5;

export const AddIcon = () => {
  const colors = useThemeColors();
  const styles = useStyles();
  return (
    <View testID="add-icon" style={styles.add} {...hidden}>
      <Svg width={GRID} height={GRID} viewBox={`0 0 ${GRID} ${GRID}`}>
        <Path d={ADD_GLYPH} fill="none" stroke={colors["primary-foreground"]} strokeWidth={ADD_STROKE} strokeLinecap="round" />
      </Svg>
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  // token-exception: the approved circular action needs a half-width radius.
  add: { width: theme.spacing.touch, height: theme.spacing.touch, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
}));

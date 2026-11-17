import { useId } from "react";
import { type ColorValue, View } from "react-native";
import Svg, { G, Mask, Path, Rect } from "react-native-svg";

import { createThemedStyles } from "@/lib/design/themedStyles";

import { GRID, hidden, ICON_BOX, type TabIconName, tabIcons } from "./tabIcons";

const STROKE = 2;

type TabIconProps = { name: TabIconName; focused: boolean; color: ColorValue };

export const TabIcon = ({ name, focused, color }: TabIconProps) => {
  const styles = useStyles();
  const maskId = useId();
  const drawing = tabIcons[name];

  return (
    <View testID={`tab-icon-${name}`} style={[styles.plate, focused && styles.plateOn]} {...hidden}>
      <Svg width={GRID} height={GRID} viewBox={`0 0 ${GRID} ${GRID}`}>
        {focused ? (
          <>
            {drawing.filled.cuts.length > 0 ? (
              <Mask id={maskId}>
                {/* token-exception: an SVG mask keeps what is white and cuts what is black, whatever the theme. */}
                <Rect width={GRID} height={GRID} fill="#fff" />
                {/* token-exception: black cuts the mask. */}
                {drawing.filled.cuts.map((d) => <Path key={d} d={d} stroke="#000" strokeWidth={STROKE} strokeLinecap="round" fill="none" />)}
              </Mask>
            ) : null}
            <G mask={drawing.filled.cuts.length > 0 ? `url(#${maskId})` : undefined}>
              {drawing.filled.shapes.map((d) => (
                <Path key={d} d={d} fill={color} stroke={drawing.filled.stroked ? color : undefined} strokeWidth={STROKE} strokeLinejoin="round" strokeLinecap="round" />
              ))}
            </G>
          </>
        ) : (
          drawing.outline.map((d) => <Path key={d} d={d} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />)
        )}
      </Svg>
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  plate: { width: ICON_BOX.width, height: ICON_BOX.height, borderRadius: ICON_BOX.height / 2, alignItems: "center", justifyContent: "center" },
  plateOn: { backgroundColor: colors.accent },
}));

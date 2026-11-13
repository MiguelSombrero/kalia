import { useId } from "react";
import { StyleSheet, View, type ColorValue } from "react-native";
import Svg, { G, Mask, Path, Rect } from "react-native-svg";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { ADD_GLYPH, ICON_BOX, tabIcons, type TabIconName } from "./tabIcons";

const GRID = 24;
const STROKE = 2;
const ADD_STROKE = 2.5;

/** Decorative: the tab's word beside it names it, so assistive technology never sees the picture. */
const hidden = { accessible: false, importantForAccessibility: "no-hide-descendants", accessibilityElementsHidden: true } as const;

type Props = { name: TabIconName; focused: boolean; color: ColorValue };

export const TabIcon = ({ name, focused, color }: Props) => {
  const colors = useThemeColors();
  const maskId = useId();
  const drawing = tabIcons[name];
  const plate = focused ? { backgroundColor: colors.accent } : null;

  return (
    <View testID={`tab-icon-${name}`} style={[styles.plate, plate]} {...hidden}>
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

export const AddIcon = () => {
  const colors = useThemeColors();
  return (
    <View testID="add-icon" style={[styles.add, { backgroundColor: colors.primary }]} {...hidden}>
      <Svg width={GRID} height={GRID} viewBox={`0 0 ${GRID} ${GRID}`}>
        <Path d={ADD_GLYPH} fill="none" stroke={colors["primary-foreground"]} strokeWidth={ADD_STROKE} strokeLinecap="round" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  plate: { width: ICON_BOX.width, height: ICON_BOX.height, borderRadius: ICON_BOX.height / 2, alignItems: "center", justifyContent: "center" },
  // token-exception: the approved circular action needs a half-width radius.
  add: { width: theme.spacing.touch, height: theme.spacing.touch, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});

import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { EDGE, square } from "@/components/metrics";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { useThemeColors } from "@/lib/design/useThemeColors";

import type { Bottle } from "./types";

const GRID = 24;
const STROKE = 2;
export const CONTAINER_PLATE = 40;

const BOTTLE = ["M10 3h4v4l2 3v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10l2-3z"];
const CAN = ["M7 5c0-1 2.2-2 5-2s5 1 5 2v14c0 1-2.2 2-5 2s-5-1-5-2z", "M7 5c0 1 2.2 2 5 2s5-1 5-2", "M7 10h10M7 15h10"];
const KEG = ["M7 7h10a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z", "M9 3h6M12 3v4", "M6 11.5h12M6 15.5h12"];

const drawings: Partial<Record<Bottle["containerType"], string[]>> = { BOTTLE, CAN, KEG };

type ContainerIconProps = { container: string };

/** Decorative: the row's spoken name carries the container, so assistive technology never sees the picture. A container this build does not know is drawn as a bottle. */
export const ContainerIcon = ({ container }: ContainerIconProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const paths = drawings[container as Bottle["containerType"]] ?? BOTTLE;
  return (
    <View testID="container-icon" style={styles.plate} accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={GRID - 2} height={GRID - 2} viewBox={`0 0 ${GRID} ${GRID}`}>
        {paths.map((d) => <Path key={d} d={d} fill="none" stroke={colors.foreground} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />)}
      </Svg>
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  plate: { ...square(CONTAINER_PLATE), borderRadius: CONTAINER_PLATE / 2, alignItems: "center", justifyContent: "center", borderWidth: EDGE, borderColor: colors.border, backgroundColor: colors["surface-sunken"] },
}));

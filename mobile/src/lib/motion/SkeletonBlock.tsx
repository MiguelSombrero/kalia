import { useEffect, useState } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { easingFor } from "./easing";
import { useReducedMotion } from "./reducedMotion";

export const SkeletonBlock = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const reduced = useReducedMotion();
  const colors = useThemeColors();
  const [breath] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) {
      breath.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: theme.duration.pulse, easing: easingFor("in-out"), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: theme.duration.pulse, easing: easingFor("in-out"), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, breath]);

  return (
    <Animated.View
      accessible={false}
      style={[{ backgroundColor: colors.divider, opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) }, style]}
    />
  );
};

import { useEffect, useState } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { easingFor } from "./easing";
import { useReducedMotion } from "./reducedMotion";

export const SkeletonBlock = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const reduced = useReducedMotion();
  const styles = useStyles();
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
      style={[styles.block, { opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) }, style]}
    />
  );
};

const useStyles = createThemedStyles((colors) => ({
  block: { backgroundColor: colors.divider },
}));

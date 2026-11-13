import { useState } from "react";
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { easingFor } from "./easing";
import { useReducedMotion } from "./reducedMotion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PRESS_SCALE = 0.98;
const PRESSED_OPACITY = 0.85;

export const PressFeedback = ({ style, onPressIn, onPressOut, ...rest }: PressableProps & { style?: StyleProp<ViewStyle> }) => {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [held, setHeld] = useState(false);

  const scaleTo = (toValue: number) => {
    if (reduced) return;
    Animated.timing(scale, { toValue, duration: theme.duration.press, easing: easingFor("out"), useNativeDriver: true }).start();
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        setHeld(true);
        scaleTo(PRESS_SCALE);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setHeld(false);
        scaleTo(1);
        onPressOut?.(event);
      }}
      style={[style, held && { opacity: PRESSED_OPACITY }, { transform: [{ scale }] }]}
    />
  );
};

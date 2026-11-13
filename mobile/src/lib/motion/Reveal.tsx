import { useEffect, useState, type ReactNode } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { easingFor } from "./easing";
import { useReducedMotion } from "./reducedMotion";

export const Reveal = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => {
  const reduced = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(reduced ? 1 : 0));

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const fade = Animated.timing(opacity, { toValue: 1, duration: theme.duration.reveal, easing: easingFor("out"), useNativeDriver: true });
    fade.start();
    return () => fade.stop();
  }, [reduced, opacity]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
};

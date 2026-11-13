import { Easing } from "react-native";
import { theme } from "@/lib/design/theme.generated";

type EasingName = keyof typeof theme.easing;

// React Native's own Easing.ease is the CSS ease-in curve, so the CSS keywords are spelled out as their cubic-beziers.
const curves: Record<(typeof theme.easing)[EasingName], [number, number, number, number]> = {
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

export const easingFor = (name: EasingName) => Easing.bezier(...curves[theme.easing[name]]);

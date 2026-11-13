import { LayoutAnimation } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { useReducedMotion } from "./reducedMotion";

export const useAnimateListChange = () => {
  const reduced = useReducedMotion();
  return () => {
    if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.create(theme.duration.layout, "easeInEaseOut", "opacity"));
  };
};

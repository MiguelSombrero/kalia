import { LayoutAnimation } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { useReducedMotion } from "./reducedMotion";

/** Returns a function to call just before a list's rows change, so rows that stay slide to their new place; under reduced motion it does nothing and they jump. */
export const useAnimateListChange = () => {
  const reduced = useReducedMotion();
  return () => {
    if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.create(theme.duration.layout, "easeInEaseOut", "opacity"));
  };
};

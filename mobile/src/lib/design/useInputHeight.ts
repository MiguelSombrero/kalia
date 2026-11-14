import { useWindowDimensions } from "react-native";
import { theme } from "./theme.generated";

/** A single-line input keeps its lineHeight in unscaled points, so at a large text size its text would be cut by the field's fixed minimum. */
export const useInputHeight = () => {
  const { fontScale } = useWindowDimensions();
  return { minHeight: Math.max(theme.spacing.touch, Math.ceil(theme.typography.body.lineHeight * fontScale) + 2 * theme.spacing.small) };
};

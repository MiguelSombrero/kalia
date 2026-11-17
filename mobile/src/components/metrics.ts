import { StyleSheet } from "react-native";

import { theme } from "@/lib/design/theme.generated";

export const EDGE = 1.5;

export const square = (size: number) => ({ width: size, aspectRatio: 1 }) as const;

export const spacing = StyleSheet.create({
  blocks: { gap: theme.spacing.large },
  lines: { gap: theme.spacing.medium },
  tight: { gap: theme.spacing.small },
});

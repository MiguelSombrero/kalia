import type { ReactNode } from "react";
import { View } from "react-native";

import { useAnnounce } from "@/lib/a11y/useAnnounce";

import { BodyText } from "./BodyText";
import { spacing } from "./metrics";

type EmptyStateProps = { message: string; children?: ReactNode };

export const EmptyState = ({ message, children }: EmptyStateProps) => {
  useAnnounce(message);
  return (
    <View style={spacing.blocks}>
      <BodyText tone="muted">{message}</BodyText>
      {children}
    </View>
  );
};

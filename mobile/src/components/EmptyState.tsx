import type { ReactNode } from "react";
import { BodyText } from "./BodyText";

export const EmptyState = ({ message, spaced = false, children }: { message: string; spaced?: boolean; children?: ReactNode }) => (
  <>
    <BodyText tone="muted" spaced={spaced}>
      {message}
    </BodyText>
    {children}
  </>
);

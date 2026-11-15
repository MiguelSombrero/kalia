import type { ReactNode } from "react";

import { useAnnounce } from "@/lib/a11y/useAnnounce";

import { BodyText } from "./BodyText";

export const EmptyState = ({ message, spaced = false, children }: { message: string; spaced?: boolean; children?: ReactNode }) => {
  useAnnounce(message);
  return (
    <>
      <BodyText tone="muted" spaced={spaced}>
        {message}
      </BodyText>
      {children}
    </>
  );
};

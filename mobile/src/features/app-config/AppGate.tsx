import type { ReactNode } from "react";
import { BlockedScreen } from "./BlockedScreen";
import { useAppGate } from "./hooks/useAppGate";

export const AppGate = ({ children }: { children: ReactNode }) => {
  const { gate, checkAgain, isChecking } = useAppGate();

  switch (gate) {
    case "loading":
      return null;
    case "maintenance":
      return <BlockedScreen reason="maintenance" onCheckAgain={checkAgain} isChecking={isChecking} />;
    case "update-required":
      return <BlockedScreen reason="updateRequired" onCheckAgain={checkAgain} isChecking={isChecking} />;
    case "open":
      return <>{children}</>;
  }
};

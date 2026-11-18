import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { type ReactNode, useEffect, useState } from "react";

import { logWarn } from "@/lib/log/deviceLog";

import { facesSettled, fontSources, settleFaces } from "./fonts";

void SplashScreen.preventAutoHideAsync();

export const FONT_DEADLINE_MS = 3000;

type FontGateProps = { children: ReactNode };

type Outcome = "loaded" | "failed" | "late";

/** `useFonts` has no timeout of its own: a load that never settles would keep the splash screen up for good. */
export const FontGate = ({ children }: FontGateProps) => {
  const [loaded, error] = useFonts(fontSources);
  const [settled, setSettled] = useState(facesSettled);
  const outcome: Outcome | null = loaded ? "loaded" : error ? "failed" : null;

  useEffect(() => {
    if (settled) {
      return;
    }
    const settle = (result: Outcome) => {
      if (!facesSettled()) {
        settleFaces(result === "loaded");
        if (result !== "loaded") {
          logWarn("Bundled fonts not loaded, using the system face", { reason: result });
        }
        SplashScreen.hideAsync().catch(() => undefined);
      }
      setSettled(true);
    };
    if (outcome) {
      settle(outcome);
      return;
    }
    const timer = setTimeout(() => settle("late"), FONT_DEADLINE_MS);
    return () => clearTimeout(timer);
  }, [outcome, settled]);

  return settled ? <>{children}</> : null;
};

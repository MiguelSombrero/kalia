import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { type ReactNode, useEffect } from "react";

import { fontSources } from "./fonts";

void SplashScreen.preventAutoHideAsync();

type FontGateProps = { children: ReactNode };

export const FontGate = ({ children }: FontGateProps) => {
  const [loaded, error] = useFonts(fontSources);
  const ready = loaded || error !== null;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  return ready ? <>{children}</> : null;
};

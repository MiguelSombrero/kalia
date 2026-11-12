import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, type ReactNode } from "react";
import { fontSources } from "./fonts";

void SplashScreen.preventAutoHideAsync();

export const FontGate = ({ children }: { children: ReactNode }) => {
  const [loaded, error] = useFonts(fontSources);
  const ready = loaded || error !== null;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  return ready ? <>{children}</> : null;
};

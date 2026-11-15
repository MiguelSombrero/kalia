import * as ReactNative from "react-native";

import { LARGEST_FONT_SCALE } from "./atLargestFontScale";

export const MODES = ["light", "dark"] as const;


export const systemIs = (mode: (typeof MODES)[number]) => jest.spyOn(ReactNative, "useColorScheme").mockReturnValue(mode);

export const withLargestFont = async (check: () => Promise<void> | void) => {
  const scale = jest.spyOn(ReactNative.PixelRatio, "getFontScale").mockReturnValue(LARGEST_FONT_SCALE);
  try {
    await check();
  } finally {
    scale.mockRestore();
  }
};

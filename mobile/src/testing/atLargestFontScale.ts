import { PixelRatio } from "react-native";

/** The largest size the phones' accessibility settings reach: iOS's Larger Accessibility Sizes top out near 3.1. */
export const LARGEST_FONT_SCALE = 3.1;

export const atLargestFontScale = () => jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(LARGEST_FONT_SCALE);

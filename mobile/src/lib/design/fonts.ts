import type { TextStyle } from "react-native";
import { theme } from "./theme.generated";

type Weight = keyof typeof theme.weights;
type TypeName = keyof typeof theme.typography;

const faces = {
  normal: { suffix: "400Regular", source: require("@expo-google-fonts/bricolage-grotesque/400Regular/BricolageGrotesque_400Regular.ttf") },
  medium: { suffix: "500Medium", source: require("@expo-google-fonts/bricolage-grotesque/500Medium/BricolageGrotesque_500Medium.ttf") },
  bold: { suffix: "700Bold", source: require("@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf") },
} as const satisfies Record<Weight, { suffix: string; source: unknown }>;

const family = (weight: Weight) => `${theme.fonts.sans}_${faces[weight].suffix}`;

export const fontSources: Record<string, number> = Object.fromEntries(
  (Object.keys(faces) as Weight[]).map((weight) => [family(weight), faces[weight].source as number]),
);

type Metrics = { size: number; lineHeight: number; letterSpacing?: number };

export const textStyle = (name: TypeName, weight: Weight): TextStyle => {
  const { size, lineHeight, letterSpacing }: Metrics = theme.typography[name];
  // token-exception: the face is named per weight from the font token, which the platform cannot select by weight.
  return { fontFamily: family(weight), fontSize: size, lineHeight, ...(letterSpacing === undefined ? {} : { letterSpacing }) };
};

/** A screen's title stops growing at twice its size, so one word still fits a phone's width; reading text never stops. */
export const titleScale = { maxFontSizeMultiplier: 2 } as const;

/** The tab bar has a fixed height, so its labels stay near their default size, as the platform's own do. */
export const tabLabelScale = { maxFontSizeMultiplier: 1.2 } as const;

/** The system text size from which a card gives its strength a line of its own instead of a column beside the text. */
export const STACK_FROM_FONT_SCALE = 1.5;

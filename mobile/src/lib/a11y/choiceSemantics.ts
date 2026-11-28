import { Platform } from "react-native";

// iOS has no radio trait: React Native fakes one by appending "radio button" and "checked" or "unchecked" to the
// row's value, in its own translation table, which VoiceOver can speak in a voice of another language. Button plus
// selected are traits iOS itself speaks in the voice's language. Android's radio role is announced by TalkBack.
export const choiceSemantics = (selected: boolean) =>
  Platform.OS === "ios" ? ({ role: "button", accessibilityState: { selected } } as const) : ({ role: "radio", accessibilityState: { checked: selected } } as const);

export const choicePlace = (text: string) => (Platform.OS === "ios" ? ({ accessibilityValue: { text } } as const) : null);

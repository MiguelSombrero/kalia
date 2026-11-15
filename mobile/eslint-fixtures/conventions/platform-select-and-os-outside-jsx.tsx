import { Platform, Text } from "react-native";

const event = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

export const Hint = () => <Text>{Platform.select({ ios: "Done", default: "OK" })}</Text>;
export const probe = event;

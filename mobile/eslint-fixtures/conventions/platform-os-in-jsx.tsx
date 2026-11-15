import { Platform, Text } from "react-native";

export const Hint = () => <Text>{Platform.OS === "ios" ? "Done" : "OK"}</Text>;

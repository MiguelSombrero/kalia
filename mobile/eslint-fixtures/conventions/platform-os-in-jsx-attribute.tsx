import { Platform, View } from "react-native";

export const Sheet = () => <View style={{ flex: Platform.OS === "android" ? 1 : 2 }} />;

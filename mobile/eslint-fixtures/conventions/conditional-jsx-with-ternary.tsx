import { Text, View } from "react-native";

export const Count = ({ count, selected }: { count: number; selected: boolean }) => (
  <View style={[{ flex: 1 }, selected && { opacity: 1 }]}>{count > 0 ? <Text>{count}</Text> : null}</View>
);

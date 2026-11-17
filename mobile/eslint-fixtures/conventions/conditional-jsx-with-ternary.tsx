import { Text, View } from "react-native";

type CountProps = { count: number; selected: boolean };

export const Count = ({ count, selected }: CountProps) => (
  <View style={[{ flex: 1 }, selected && { opacity: 1 }]}>{count > 0 ? <Text>{count}</Text> : null}</View>
);

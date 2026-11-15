import { Text, View } from "react-native";

export const Count = ({ count }: { count: number }) => <View>{count && <Text>{count}</Text>}</View>;

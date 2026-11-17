import { Text, View } from "react-native";

type CountProps = { count: number };

export const Count = ({ count }: CountProps) => <View>{count && <Text>{count}</Text>}</View>;

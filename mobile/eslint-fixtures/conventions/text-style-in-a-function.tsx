import { Text } from "react-native";

import { textStyle } from "@/lib/design/fonts";
import { createThemedStyles } from "@/lib/design/themedStyles";

const useStyles = createThemedStyles(() => ({ title: textStyle("screen-title", "bold") }));

export const Title = () => {
  const styles = useStyles();
  return <Text style={[styles.title, textStyle("body", "normal")]}>a</Text>;
};

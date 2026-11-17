import { Text } from "react-native";

import { textStyle, titleScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

type ScreenTitleProps = { children: string };

export const ScreenTitle = ({ children }: ScreenTitleProps) => {
  const styles = useStyles();
  return (
    <Text role="heading" {...titleScale} style={styles.title}>
      {children}
    </Text>
  );
};

const useStyles = createThemedStyles((colors) => ({
  title: { ...textStyle("screen-title", "bold"), marginTop: theme.spacing.small, marginBottom: theme.spacing.small, color: colors.foreground },
}));

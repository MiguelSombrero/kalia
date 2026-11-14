import { StyleSheet, Text } from "react-native";
import { textStyle, titleScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";

export const ScreenTitle = ({ children }: { children: string }) => {
  const colors = useThemeColors();
  const styles = StyleSheet.create({
    title: { ...textStyle("screen-title", "bold"), marginTop: theme.spacing.small, marginBottom: theme.spacing.small, color: colors.foreground },
  });
  return (
    <Text role="heading" {...titleScale} style={styles.title}>
      {children}
    </Text>
  );
};

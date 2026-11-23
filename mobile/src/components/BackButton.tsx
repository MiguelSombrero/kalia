import { Platform, Text } from "react-native";
import Svg, { Path } from "react-native-svg";

import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { PressFeedback } from "@/lib/motion/PressFeedback";

type BackButtonProps = { label: string; accessibilityLabel: string; onPress: () => void };

/** The way back out of a pushed screen: iOS's chevron and the screen it returns to, Android's arrow alone. Both are named in words. */
export const BackButton = ({ label, accessibilityLabel, onPress }: BackButtonProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const ios = Platform.OS === "ios";
  return (
    <PressFeedback role="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.button}>
      <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>
        <Path d={ios ? "M15 5l-7 7 7 7" : "M19 12H5M11 6l-6 6 6 6"} fill="none" stroke={colors.primary} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {ios ? <Text style={styles.label}>{label}</Text> : null}
    </PressFeedback>
  );
};

const useStyles = createThemedStyles((colors) => ({
  button: { minHeight: theme.spacing.touch, minWidth: theme.spacing.touch, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", paddingRight: theme.spacing.small },
  label: { ...textStyle("body", "bold"), color: colors.primary },
}));

import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { square } from "@/components/metrics";
import { useAnnounce } from "@/lib/a11y/useAnnounce";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { useThemeColors } from "@/lib/design/useThemeColors";

const MARK = 16;

type FieldErrorProps = { message: string };

export const FieldError = ({ message }: FieldErrorProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  useAnnounce(message);
  return (
    <View style={styles.line}>
      <View testID="error-mark" style={styles.mark} accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Svg width={MARK} height={MARK} viewBox="0 0 16 16">
          <Path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke={colors["destructive-foreground"]} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </View>
      <Text role="alert" style={styles.message}>
        {message}
      </Text>
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  line: { flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.small, marginBottom: theme.spacing.small },
  // token-exception: drops the square to the middle of the message's first line, a step no spacing token is small enough for.
  mark: { ...square(MARK), marginTop: 2, backgroundColor: colors.destructive },
  // token-exception: lets the message shrink below its longest line, so it wraps beside the mark.
  message: { ...textStyle("supporting", "bold"), color: colors.foreground, flex: 1, minWidth: 0 },
}));

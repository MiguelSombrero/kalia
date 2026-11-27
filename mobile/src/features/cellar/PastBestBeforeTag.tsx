import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { useThemeColors } from "@/lib/design/useThemeColors";

/** Says a bottle is past its best-before date in words and a clock, in ink and not red, so it never rests on colour and does not read as spoiled. */
export const PastBestBeforeTag = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const colors = useThemeColors();
  return (
    <View testID="past-best-before" style={styles.tag}>
      <Svg width={14} height={14} viewBox="0 0 24 24" accessible={false}>
        <Circle cx={12} cy={12} r={9} fill="none" stroke={colors.foreground} strokeWidth={2.4} />
        <Path d="M12 7v5l3 2" fill="none" stroke={colors.foreground} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={styles.label}>{t("cellar.bottle.pastBestBefore")}</Text>
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  tag: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: theme.spacing.small, paddingHorizontal: theme.spacing.small, borderWidth: 1, borderColor: colors.foreground, borderRadius: theme.radius.card },
  label: { ...textStyle("label", "bold"), color: colors.foreground, flexShrink: 1 },
}));

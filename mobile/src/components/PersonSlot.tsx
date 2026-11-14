import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { Text, View } from "react-native";

export const PersonSlot = ({ name }: { name: string }) => {
  const styles = useStyles();
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.slot}>
      <Text style={styles.initials}>{name.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  slot: {
    minWidth: theme.spacing.touch,
    minHeight: theme.spacing.touch,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.small,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: theme.radius.card,
    backgroundColor: colors.surface,
  },
  initials: { ...textStyle("body", "bold"), color: colors.foreground },
}));

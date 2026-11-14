import { Text, View } from "react-native";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";

export const InfoRow = ({ title, value }: { title: string; value: string }) => {
  const styles = useStyles();
  return (
    <View accessible style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  row: { paddingVertical: theme.spacing.small, paddingHorizontal: theme.spacing.tight, marginBottom: theme.spacing.small },
  title: { ...textStyle("label", "bold"), textTransform: "uppercase", color: colors["muted-foreground"] },
  value: { ...textStyle("body", "bold"), color: colors.foreground },
}));

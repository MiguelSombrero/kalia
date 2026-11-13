import { StyleSheet, Text, TextInput, View } from "react-native";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";

const EDGE = 1.5;
const MIN_FIELD_WIDTH = 140;

type Labels = { group: string; from: string; to: string };

export const StrengthFields = ({ from, to, onFrom, onTo, error, labels }: { from: string; to: string; onFrom: (text: string) => void; onTo: (text: string) => void; error: string | null; labels: Labels }) => {
  const colors = useThemeColors();
  const styles = StyleSheet.create({
    pair: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.small },
    cell: { flexGrow: 1, flexBasis: MIN_FIELD_WIDTH },
    caption: { ...textStyle("supporting", "medium"), color: colors["muted-foreground"], marginBottom: theme.spacing.small / 2 },
    input: { minHeight: theme.spacing.touch, paddingHorizontal: theme.spacing.tight, borderWidth: EDGE, borderColor: error ? colors.destructive : colors.border, borderRadius: theme.radius.card, backgroundColor: colors.surface, ...textStyle("body", "medium"), color: colors.foreground },
    error: { ...textStyle("supporting", "bold"), color: colors.destructive, marginTop: theme.spacing.small },
  });
  const field = (caption: string, value: string, onChange: (text: string) => void, placeholder: string) => (
    <View style={styles.cell}>
      <Text style={styles.caption}>{caption}</Text>
      <TextInput
        accessibilityLabel={`${labels.group}: ${caption}`}
        aria-invalid={error !== null}
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors["muted-foreground"]}
        style={styles.input}
      />
    </View>
  );
  return (
    <View role="group" accessibilityLabel={labels.group}>
      <View style={styles.pair}>
        {field(labels.from, from, onFrom, "0")}
        {field(labels.to, to, onTo, "100")}
      </View>
      {error ? (
        <Text role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

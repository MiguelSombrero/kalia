import { Pressable, Text, TextInput, View } from "react-native";

import { EDGE } from "@/components/metrics";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { useInputHeight } from "@/lib/design/useInputHeight";
import { useThemeColors } from "@/lib/design/useThemeColors";

import { MAX_FILTER_LENGTH } from "./model";

type SearchFieldProps = { value: string; onChange: (text: string) => void; label: string; placeholder: string; clearLabel: string; onSubmit?: () => void };

export const SearchField = ({ value, onChange, label, placeholder, clearLabel, onSubmit }: SearchFieldProps) => {
  const colors = useThemeColors();
  const styles = useSearchFieldStyles();
  const grown = useInputHeight();
  return (
    <View style={[styles.field, grown]}>
      <TextInput
        role="searchbox"
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={colors["muted-foreground"]}
        value={value}
        onChangeText={onChange}
        maxLength={MAX_FILTER_LENGTH}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoCorrect={false}
        autoCapitalize="none"
        style={[styles.input, grown]}
      />
      {value ? (
        <Pressable role="button" accessibilityLabel={clearLabel} onPress={() => onChange("")} style={styles.clear}>
          <Text style={styles.clearText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const useSearchFieldStyles = createThemedStyles((colors) => ({
  field: { flex: 1, flexDirection: "row", alignItems: "center", minHeight: theme.spacing.touch, borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, backgroundColor: colors.surface, paddingLeft: theme.spacing.medium },
  input: { flexGrow: 1, flexShrink: 1, ...textStyle("body", "medium"), color: colors.foreground, paddingVertical: theme.spacing.small },
  clear: { minWidth: theme.spacing.touch, minHeight: theme.spacing.touch, alignItems: "center", justifyContent: "center" },
  clearText: { ...textStyle("body", "bold"), color: colors["muted-foreground"] },
}));

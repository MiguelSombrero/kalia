import DateTimePicker from "@react-native-community/datetimepicker";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { type HostInstance, useWindowDimensions, View } from "react-native";

import { EDGE } from "@/components/metrics";
import { useRevealInSheet } from "@/components/Sheet";
import { TextButton } from "@/components/TextButton";
import { STACK_FROM_FONT_SCALE } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { useThemeColors } from "@/lib/design/useThemeColors";

import { dayAsDate, localToday } from "./bottles";
import type { DateFieldProps } from "./dateFieldProps";
import { DateRow } from "./DateRow";
import { FieldError } from "./FieldError";

export const DateField = ({ label, value, onChange, maximumDate, error, open, onOpenChange }: DateFieldProps) => {
  const styles = useStyles();
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const shownDay = value ?? localToday();
  // Do not remove `collapsable={false}` from the view this measures: flattened, it cannot be measured, and the calendar silently opens out of view.
  const field = useRef<HostInstance>(null);
  const reveal = useRevealInSheet();
  const wide = useWindowDimensions().fontScale >= STACK_FROM_FONT_SCALE;
  const clear = (
    <TextButton
      label={t("bottleForm.clearDate")}
      accessibilityLabel={t("bottleForm.clearDateFor", { field: label })}
      onPress={() => {
        onChange(null);
        onOpenChange(false);
      }}
    />
  );
  return (
    <View ref={field} collapsable={false}>
      <DateRow label={label} value={value} error={error} onPress={() => onOpenChange(!open)} />
      {error ? <FieldError message={error} /> : null}
      {open ? (
        <View testID="date-well" style={[styles.well, wide && styles.wellWide]} onLayout={() => reveal(field.current)}>
          <DateTimePicker
            testID="date-picker"
            accessibilityLabel={label}
            mode="date"
            display="inline"
            value={dayAsDate(shownDay)}
            maximumDate={maximumDate}
            locale={i18n.language}
            accentColor={colors.primary}
            onValueChange={(_event, date) => onChange(localToday(date))}
          />
          <View style={styles.actions}>
            {value ? clear : <TextButton label={t("cellar.add.cancel")} accessibilityLabel={t("bottleForm.cancelFor", { field: label })} onPress={() => onOpenChange(false)} />}
            <TextButton
              label={t("bottleForm.done")}
              accessibilityLabel={t("bottleForm.doneFor", { field: label })}
              onPress={() => {
                onChange(shownDay);
                onOpenChange(false);
              }}
            />
          </View>
        </View>
      ) : value ? (
        <View style={styles.clear}>{clear}</View>
      ) : null}
    </View>
  );
};

const useStyles = createThemedStyles((colors) => ({
  well: { borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, padding: theme.spacing.small, marginBottom: theme.spacing.small },
  // token-exception: cancels the sheet's side padding, so the calendar gets the whole width it needs.
  wellWide: { borderWidth: 0, paddingHorizontal: 0, marginHorizontal: -theme.spacing.medium },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  clear: { flexDirection: "row", justifyContent: "flex-end" },
}));

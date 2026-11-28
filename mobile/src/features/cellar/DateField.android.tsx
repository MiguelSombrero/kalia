import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { TextButton } from "@/components/TextButton";

import { dayAsDate, localToday } from "./bottles";
import type { DateFieldProps } from "./dateFieldProps";
import { DateRow } from "./DateRow";
import { FieldError } from "./FieldError";

export const DateField = ({ label, value, onChange, maximumDate, error }: DateFieldProps) => {
  const { t } = useTranslation();
  const open = () =>
    DateTimePickerAndroid.open({
      mode: "date",
      display: "calendar",
      value: dayAsDate(value ?? localToday()),
      maximumDate,
      neutralButton: value ? { label: t("bottleForm.clear") } : undefined,
      onValueChange: (_event, date) => onChange(localToday(date)),
      onNeutralButtonPress: () => onChange(null),
    });
  return (
    <View>
      <DateRow label={label} value={value} error={error} onPress={open} />
      {error ? <FieldError message={error} /> : null}
      {value ? (
        <View style={styles.clear}>
          <TextButton label={t("bottleForm.clearDate")} accessibilityLabel={t("bottleForm.clearDateFor", { field: label })} onPress={() => onChange(null)} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  clear: { flexDirection: "row", justifyContent: "flex-end" },
});

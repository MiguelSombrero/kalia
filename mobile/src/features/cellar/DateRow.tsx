import { useTranslation } from "react-i18next";

import { FieldRow } from "@/components/FieldRow";

import { formatBottleDate } from "./bottles";

type DateRowProps = { label: string; value: string | null; error?: string; onPress: () => void };

export const DateRow = ({ label, value, error, onPress }: DateRowProps) => {
  const { t, i18n } = useTranslation();
  const shown = value ? formatBottleDate(value, i18n.language) : t("bottleForm.notSet");
  const spoken = error ? `${label}: ${shown}, ${error}` : `${label}: ${shown}`;
  return <FieldRow title={label} value={shown} empty={!value} invalid={Boolean(error)} accessibilityLabel={spoken} onPress={onPress} />;
};

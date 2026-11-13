import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "@/lib/design/theme.generated";
import { countryName } from "@/lib/i18n/countryNames";
import { Chip, TextButton } from "./controls";
import { DEFAULT_SORT, hasStrength, strengthError, toNumber, type ActiveFilterKey, type Filters } from "./model";

type Active = { key: ActiveFilterKey; label: string; plain: string; style?: string };

export const useActiveFilters = (filters: Filters): Active[] => {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 });
  const active: Active[] = [];
  if (filters.style) active.push({ key: "style", label: filters.style, plain: filters.style, style: filters.style });
  if (filters.breweryId) active.push({ key: "brewery", label: filters.breweryName, plain: filters.breweryName });
  if (filters.countryCode) {
    const name = countryName(filters.countryCode, i18n.language);
    active.push({ key: "country", label: name, plain: name });
  }
  if (hasStrength(filters) && strengthError(filters) === null) {
    const from = toNumber(filters.min);
    const to = toNumber(filters.max);
    const label = from !== null && to !== null ? `${number.format(from)}–${number.format(to)} %` : from !== null ? t("catalogFilters.atLeast", { value: number.format(from) }) : t("catalogFilters.atMost", { value: number.format(to ?? 0) });
    active.push({ key: "strength", label, plain: label });
  }
  if (filters.sort !== DEFAULT_SORT) {
    const sort = t(`catalogFilters.sorts.${filters.sort}`);
    active.push({ key: "sort", label: t("catalogFilters.sortedBy", { sort }), plain: sort });
  }
  return active;
};

export const FilterChips = ({ filters, onRemove, onClearAll }: { filters: Filters; onRemove: (key: ActiveFilterKey) => void; onClearAll: () => void }) => {
  const { t } = useTranslation();
  const active = useActiveFilters(filters);
  if (active.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: theme.spacing.small, marginBottom: theme.spacing.small }}>
      {active.map((filter) => (
        <Chip key={filter.key} label={filter.label} style={filter.style} removeLabel={t("catalogFilters.removeFilter", { filter: filter.plain })} onPress={() => onRemove(filter.key)} />
      ))}
      <TextButton label={t("catalogFilters.clearAll")} onPress={onClearAll} />
    </View>
  );
};

import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { ChoiceRow } from "@/components/ChoiceRow";
import { spacing } from "@/components/metrics";
import { SearchField } from "@/components/SearchField";
import { textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { countryName } from "@/lib/i18n/countryNames";

import { useBreweryOptions, useCountryOptions, useStyleOptions } from "../hooks/useFilterOptions";
import type { Filters } from "./model";
import { StyleSwatch } from "./StyleSwatch";

const normalise = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type FilterPickerProps = { page: "style" | "brewery" | "country"; draft: Filters; onPick: (patch: Partial<Filters>) => void };

export const FilterPicker = ({ page, draft, onPick }: FilterPickerProps) => {
  const { t, i18n } = useTranslation();
  const styles = usePickerStyles();
  const [text, setText] = useState("");
  const query = normalise(text.trim());
  const styleOptions = useStyleOptions(page === "style");
  const countryOptions = useCountryOptions(page === "country");
  const breweryOptions = useBreweryOptions(text.trim(), page === "brewery");
  const noMatch = <Text style={styles.note}>{t("catalogFilters.noMatch", { query: text })}</Text>;
  let rows: ReactNode = null;
  let footer: ReactNode = null;
  if (page === "style") {
    const list = (styleOptions.data ?? []).filter((style) => !query || normalise(style).includes(query));
    const lead = query ? 0 : 1;
    rows = (
      <>
        {!query ? <ChoiceRow label={t("catalogFilters.anyStyle")} position={{ index: 1, count: lead + list.length }} selected={!draft.style} onPress={() => onPick({ style: "" })} /> : null}
        {list.map((style, index) => (
          <ChoiceRow key={style} position={{ index: lead + index + 1, count: lead + list.length }} label={style} leading={<StyleSwatch style={style} />} selected={draft.style === style} onPress={() => onPick({ style })} />
        ))}
        {styleOptions.isSuccess && list.length === 0 ? noMatch : null}
      </>
    );
  } else if (page === "country") {
    const list = (countryOptions.data ?? [])
      .map((code) => ({ code, name: countryName(code, i18n.language) }))
      .filter((country) => !query || normalise(country.name).includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, i18n.language));
    const lead = query ? 0 : 1;
    rows = (
      <>
        {!query ? <ChoiceRow label={t("catalogFilters.anyCountry")} position={{ index: 1, count: lead + list.length }} selected={!draft.countryCode} onPress={() => onPick({ countryCode: "" })} /> : null}
        {list.map((country, index) => (
          <ChoiceRow key={country.code} position={{ index: lead + index + 1, count: lead + list.length }} label={country.name} selected={draft.countryCode === country.code} onPress={() => onPick({ countryCode: country.code })} />
        ))}
        {countryOptions.isSuccess && list.length === 0 ? noMatch : null}
      </>
    );
  } else {
    const pages = breweryOptions.data?.pages ?? [];
    const items = pages.flatMap((result) => result.content);
    const total = pages[0]?.totalElements ?? 0;
    const lead = text ? 0 : 1;
    const count = lead + Math.max(total, items.length);
    rows = (
      <>
        {!text ? <ChoiceRow label={t("catalogFilters.anyBrewery")} position={{ index: 1, count }} selected={!draft.breweryId} onPress={() => onPick({ breweryId: "", breweryName: "" })} /> : null}
        {items.map((brewery, index) => (
          <ChoiceRow key={brewery.id} position={{ index: lead + index + 1, count }} label={brewery.name} sub={[brewery.city, countryName(brewery.countryCode, i18n.language)].filter(Boolean).join(" · ")} selected={draft.breweryId === brewery.id} onPress={() => onPick({ breweryId: brewery.id, breweryName: brewery.name })} />
        ))}
        {breweryOptions.isSuccess && items.length === 0 ? noMatch : null}
      </>
    );
    footer = breweryOptions.hasNextPage ? (
      <View style={spacing.blocks}>
        <Text style={styles.muted}>{t("catalogFilters.showing", { shown: new Intl.NumberFormat(i18n.language).format(items.length), total: new Intl.NumberFormat(i18n.language).format(total) })}</Text>
        <ActionButton variant="secondary" label={t("catalogFilters.more")} onPress={() => void breweryOptions.fetchNextPage()} busy={breweryOptions.isFetchingNextPage} />
      </View>
    ) : null;
  }
  const label = t(`catalogFilters.find.${page}`);
  return (
    <>
      <View style={styles.search}>
        <SearchField value={text} onChange={setText} label={label} placeholder={label} clearLabel={t("catalogFilters.clearSearch")} />
      </View>
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets role="radiogroup" accessibilityLabel={t(`catalogFilters.${page}`)}>
        {rows}
        {footer}
      </ScrollView>
    </>
  );
};

const usePickerStyles = createThemedStyles((colors) => ({
  search: { flexDirection: "row", paddingHorizontal: theme.spacing.medium, paddingTop: theme.spacing.small },
  list: { paddingHorizontal: theme.spacing.medium, paddingBottom: theme.spacing.large },
  note: { ...textStyle("body", "normal"), color: colors.foreground, paddingVertical: theme.spacing.medium },
  muted: { ...textStyle("supporting", "medium"), color: colors["muted-foreground"], paddingTop: theme.spacing.medium },
}));

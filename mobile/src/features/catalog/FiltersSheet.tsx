import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, BackHandler, type HostInstance, Keyboard, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ActionButton } from "@/components/ActionButton";
import { ChoiceRow } from "@/components/ChoiceRow";
import { FieldRow } from "@/components/FieldRow";
import { Sheet } from "@/components/Sheet";
import { TextButton } from "@/components/TextButton";
import { textStyle, titleScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { countryName } from "@/lib/i18n/countryNames";
import { SearchField, StyleSwatch } from "./filters/controls";
import { emptyFilters, SORTS, sheetFilterCount, strengthError, type Filters } from "./filters/model";
import { StrengthFields } from "./filters/StrengthFields";
import { useBreweryOptions, useCountryOptions, useResultCount, useStyleOptions } from "./hooks/useFilterOptions";

type Page = "form" | "style" | "brewery" | "country";

const useKeyboardHeight = () => {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (event) => setHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
};

const normalise = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const FiltersSheet = ({ initial, onApply, onClose }: { initial: Filters; onApply: (filters: Filters) => void; onClose: () => void }) => {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const [draft, setDraft] = useState<Filters>(initial);
  const [page, setPage] = useState<Page>("form");
  const keyboard = useKeyboardHeight();
  const heading = useRef<HostInstance>(null);
  const count = useResultCount(draft);
  const error = strengthError(draft);
  useEffect(() => {
    if (page === "form") return;
    if (heading.current) AccessibilityInfo.sendAccessibilityEvent(heading.current, "focus");
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setPage("form");
      return true;
    });
    return () => subscription.remove();
  }, [page]);
  const set = (patch: Partial<Filters>) => setDraft((current) => ({ ...current, ...patch }));
  const pick = (patch: Partial<Filters>) => {
    set(patch);
    setPage("form");
  };
  const number = new Intl.NumberFormat(i18n.language);
  const applyLabel = count.data === undefined ? t("catalogFilters.apply.unknown") : t("catalogFilters.apply.count", { count: count.data, formatted: number.format(count.data) });
  const styles = StyleSheet.create({
    section: { marginTop: theme.spacing.large },
    label: { ...textStyle("label", "bold"), textTransform: "uppercase", color: colors["muted-foreground"], marginBottom: theme.spacing.small },
    doneBar: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: theme.spacing.small, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface },
  });

  if (page !== "form") {
    return (
      <Sheet title={t(`catalogFilters.${page}`)} closeLabel={`‹ ${t("catalogFilters.title")}`} closeAccessibilityLabel={t("catalogFilters.backToFilters")} onClose={() => setPage("form")} headingRef={heading} scroll={false}>
        <Picker page={page} draft={draft} onPick={pick} />
      </Sheet>
    );
  }

  const countryLabel = draft.countryCode ? countryName(draft.countryCode, i18n.language) : t("catalogFilters.anyCountry");
  return (
    <Sheet
      title={t("catalogFilters.title")}
      closeLabel={t("catalogFilters.close")}
      onClose={onClose}
      trailing={sheetFilterCount(draft) > 0 ? <TextButton label={t("catalogFilters.clearAll")} onPress={() => setDraft({ ...emptyFilters(), query: draft.query })} /> : null}
      bottomInset={keyboard}
      bar={
        Platform.OS === "ios" && keyboard > 0 ? (
          <View style={styles.doneBar}>
            <TextButton label={t("catalogFilters.done")} onPress={() => Keyboard.dismiss()} />
          </View>
        ) : null
      }
      footer={<ActionButton flush maxFontSizeMultiplier={titleScale.maxFontSizeMultiplier} label={applyLabel} disabled={error !== null} onPress={() => onApply(draft)} />}
    >
      <FieldRow title={t("catalogFilters.style")} value={draft.style || t("catalogFilters.anyStyle")} empty={!draft.style} leading={draft.style ? <StyleSwatch style={draft.style} /> : undefined} accessibilityLabel={`${t("catalogFilters.style")}: ${draft.style || t("catalogFilters.anyStyle")}`} onPress={() => setPage("style")} />
      <FieldRow title={t("catalogFilters.brewery")} value={draft.breweryName || t("catalogFilters.anyBrewery")} empty={!draft.breweryId} accessibilityLabel={`${t("catalogFilters.brewery")}: ${draft.breweryName || t("catalogFilters.anyBrewery")}`} onPress={() => setPage("brewery")} />
      <FieldRow title={t("catalogFilters.country")} value={countryLabel} empty={!draft.countryCode} accessibilityLabel={`${t("catalogFilters.country")}: ${countryLabel}`} onPress={() => setPage("country")} />
      <View style={styles.section}>
        <Text style={styles.label}>{t("catalogFilters.strength")}</Text>
        <StrengthFields from={draft.min} to={draft.max} onFrom={(min) => set({ min })} onTo={(max) => set({ max })} error={error ? t(`catalogFilters.error.${error}`) : null} labels={{ group: t("catalogFilters.strength"), from: t("catalogFilters.from"), to: t("catalogFilters.to") }} />
      </View>
      <View style={styles.section} role="radiogroup" accessibilityLabel={t("catalogFilters.sort")}>
        <Text style={styles.label}>{t("catalogFilters.sort")}</Text>
        {SORTS.map((value) => (
          <ChoiceRow key={value} bordered label={t(`catalogFilters.sorts.${value}`)} selected={draft.sort === value} onPress={() => set({ sort: value })} />
        ))}
      </View>
    </Sheet>
  );
};

const Picker = ({ page, draft, onPick }: { page: "style" | "brewery" | "country"; draft: Filters; onPick: (patch: Partial<Filters>) => void }) => {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const [text, setText] = useState("");
  const query = normalise(text.trim());
  const styleOptions = useStyleOptions(page === "style");
  const countryOptions = useCountryOptions(page === "country");
  const breweryOptions = useBreweryOptions(text.trim(), page === "brewery");
  const styles = StyleSheet.create({
    search: { flexDirection: "row", paddingHorizontal: theme.spacing.medium, paddingTop: theme.spacing.small },
    list: { paddingHorizontal: theme.spacing.medium, paddingBottom: theme.spacing.large },
    note: { ...textStyle("body", "normal"), color: colors.foreground, paddingVertical: theme.spacing.medium },
    muted: { ...textStyle("supporting", "medium"), color: colors["muted-foreground"], paddingTop: theme.spacing.medium },
  });
  const noMatch = <Text style={styles.note}>{t("catalogFilters.noMatch", { query: text })}</Text>;
  let rows: ReactNode = null;
  let footer: ReactNode = null;
  if (page === "style") {
    const list = (styleOptions.data ?? []).filter((style) => !query || normalise(style).includes(query));
    rows = (
      <>
        {!query ? <ChoiceRow label={t("catalogFilters.anyStyle")} selected={!draft.style} onPress={() => onPick({ style: "" })} /> : null}
        {list.map((style) => (
          <ChoiceRow key={style} label={style} leading={<StyleSwatch style={style} />} selected={draft.style === style} onPress={() => onPick({ style })} />
        ))}
        {styleOptions.isSuccess && list.length === 0 ? noMatch : null}
      </>
    );
  } else if (page === "country") {
    const list = (countryOptions.data ?? [])
      .map((code) => ({ code, name: countryName(code, i18n.language) }))
      .filter((country) => !query || normalise(country.name).includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, i18n.language));
    rows = (
      <>
        {!query ? <ChoiceRow label={t("catalogFilters.anyCountry")} selected={!draft.countryCode} onPress={() => onPick({ countryCode: "" })} /> : null}
        {list.map((country) => (
          <ChoiceRow key={country.code} label={country.name} selected={draft.countryCode === country.code} onPress={() => onPick({ countryCode: country.code })} />
        ))}
        {countryOptions.isSuccess && list.length === 0 ? noMatch : null}
      </>
    );
  } else {
    const pages = breweryOptions.data?.pages ?? [];
    const items = pages.flatMap((result) => result.content);
    const total = pages[0]?.totalElements ?? 0;
    rows = (
      <>
        {!text ? <ChoiceRow label={t("catalogFilters.anyBrewery")} selected={!draft.breweryId} onPress={() => onPick({ breweryId: "", breweryName: "" })} /> : null}
        {items.map((brewery) => (
          <ChoiceRow key={brewery.id} label={brewery.name} sub={[brewery.city, countryName(brewery.countryCode, i18n.language)].filter(Boolean).join(" · ")} selected={draft.breweryId === brewery.id} onPress={() => onPick({ breweryId: brewery.id, breweryName: brewery.name })} />
        ))}
        {breweryOptions.isSuccess && items.length === 0 ? noMatch : null}
      </>
    );
    footer = breweryOptions.hasNextPage ? (
      <View>
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

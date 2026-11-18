import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, BackHandler, type HostInstance, Keyboard, Platform, Text, View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { ChoiceRow } from "@/components/ChoiceRow";
import { FieldRow } from "@/components/FieldRow";
import { Sheet } from "@/components/Sheet";
import { TextButton } from "@/components/TextButton";
import { textStyle, titleScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { countryName } from "@/lib/i18n/countryNames";

import { FilterPicker } from "./filters/FilterPicker";
import { emptyFilters, type Filters, sheetFilterCount, SORTS, strengthError } from "./filters/model";
import { StrengthFields } from "./filters/StrengthFields";
import { StyleSwatch } from "./filters/StyleSwatch";
import { useResultCount } from "./hooks/useFilterOptions";

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

type FiltersSheetProps = { initial: Filters; onApply: (filters: Filters) => void; onClose: () => void };

export const FiltersSheet = ({ initial, onApply, onClose }: FiltersSheetProps) => {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  const [draft, setDraft] = useState<Filters>(initial);
  const [page, setPage] = useState<Page>("form");
  const keyboard = useKeyboardHeight();
  const heading = useRef<HostInstance>(null);
  const count = useResultCount(draft);
  const error = strengthError(draft);
  const moved = useRef(false);
  const show = (next: Page) => {
    moved.current = true;
    setPage(next);
  };
  useEffect(() => {
    if (moved.current && heading.current) AccessibilityInfo.sendAccessibilityEvent(heading.current, "focus");
  }, [page]);
  useEffect(() => {
    if (page === "form") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      show("form");
      return true;
    });
    return () => subscription.remove();
  }, [page]);
  const set = (patch: Partial<Filters>) => setDraft((current) => ({ ...current, ...patch }));
  const pick = (patch: Partial<Filters>) => {
    set(patch);
    show("form");
  };
  const number = new Intl.NumberFormat(i18n.language);
  const applyLabel = count.data === undefined ? t("catalogFilters.apply.unknown") : t("catalogFilters.apply.count", { count: count.data, formatted: number.format(count.data) });

  if (page !== "form") {
    return (
      <Sheet title={t(`catalogFilters.${page}`)} closeLabel={`‹ ${t("catalogFilters.title")}`} closeAccessibilityLabel={t("catalogFilters.backToFilters")} onClose={() => show("form")} headingRef={heading} scroll={false}>
        <FilterPicker page={page} draft={draft} onPick={pick} />
      </Sheet>
    );
  }

  const countryLabel = draft.countryCode ? countryName(draft.countryCode, i18n.language) : t("catalogFilters.anyCountry");
  return (
    <Sheet
      title={t("catalogFilters.title")}
      closeLabel={t("catalogFilters.close")}
      onClose={onClose}
      headingRef={heading}
      trailing={sheetFilterCount(draft) > 0 ? <TextButton label={t("catalogFilters.clearAll")} onPress={() => setDraft({ ...emptyFilters(), query: draft.query })} /> : null}
      bottomInset={keyboard}
      bar={
        Platform.select({
          ios:
            keyboard > 0 ? (
              <View style={styles.doneBar}>
                <TextButton label={t("catalogFilters.done")} onPress={() => Keyboard.dismiss()} />
              </View>
            ) : null,
          default: null,
        })
      }
      footer={<ActionButton maxFontSizeMultiplier={titleScale.maxFontSizeMultiplier} label={applyLabel} disabled={error !== null} onPress={() => onApply(draft)} />}
    >
      <FieldRow title={t("catalogFilters.style")} value={draft.style || t("catalogFilters.anyStyle")} empty={!draft.style} leading={draft.style ? <StyleSwatch style={draft.style} /> : undefined} accessibilityLabel={`${t("catalogFilters.style")}: ${draft.style || t("catalogFilters.anyStyle")}`} onPress={() => show("style")} />
      <FieldRow title={t("catalogFilters.brewery")} value={draft.breweryName || t("catalogFilters.anyBrewery")} empty={!draft.breweryId} accessibilityLabel={`${t("catalogFilters.brewery")}: ${draft.breweryName || t("catalogFilters.anyBrewery")}`} onPress={() => show("brewery")} />
      <FieldRow title={t("catalogFilters.country")} value={countryLabel} empty={!draft.countryCode} accessibilityLabel={`${t("catalogFilters.country")}: ${countryLabel}`} onPress={() => show("country")} />
      <View style={styles.section}>
        <Text style={styles.label}>{t("catalogFilters.strength")}</Text>
        <StrengthFields from={draft.min} to={draft.max} onFrom={(min) => set({ min })} onTo={(max) => set({ max })} error={error ? t(`catalogFilters.error.${error}`) : null} labels={{ group: t("catalogFilters.strength"), from: t("catalogFilters.from"), to: t("catalogFilters.to") }} />
      </View>
      <View style={styles.section} role="radiogroup" accessibilityLabel={t("catalogFilters.sort")}>
        <Text style={styles.label}>{t("catalogFilters.sort")}</Text>
        {SORTS.map((value, index) => (
          <ChoiceRow key={value} position={{ index: index + 1, count: SORTS.length }} bordered label={t(`catalogFilters.sorts.${value}`)} selected={draft.sort === value} onPress={() => set({ sort: value })} />
        ))}
      </View>
    </Sheet>
  );
};

const useStyles = createThemedStyles((colors) => ({
  section: { marginTop: theme.spacing.large },
  label: { ...textStyle("label", "bold"), textTransform: "uppercase", color: colors["muted-foreground"], marginBottom: theme.spacing.small },
  doneBar: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: theme.spacing.small, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface },
}));

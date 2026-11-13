import { textStyle, titleScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLayoutEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ActionButton } from "@/components/ActionButton";
import { ErrorReference } from "@/components/ErrorReference";
import { Reveal, SkeletonBlock, useAnimateListChange } from "@/lib/motion";
import { useRouter } from "expo-router";
import { BeerCard } from "./BeerCard";
import { FiltersButton, SearchField } from "./filters/controls";
import { FilterChips } from "./filters/FilterChips";
import { emptyFilters, removeFilter, sheetFilterCount, type ActiveFilterKey } from "./filters/model";
import { useFiltersStore } from "./filters/store";
import type { BeerSummary } from "./api";
import { useBeers } from "./hooks/useBeers";

export const CatalogScreen = () => {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const beers = useBeers();
  const router = useRouter();
  const { applied, apply, setQuery } = useFiltersStore();
  const inForce = sheetFilterCount(applied);
  const remove = (key: ActiveFilterKey) => apply(removeFilter(applied, key));
  const animateListChange = useAnimateListChange();
  const [pulled, setPulled] = useState(false);
  const pull = () => {
    setPulled(true);
    void beers.refetch().finally(() => setPulled(false));
  };
  const shown = useRef<BeerSummary[] | undefined>(undefined);

  useLayoutEffect(() => {
    if (shown.current && beers.data && shown.current !== beers.data) animateListChange();
    shown.current = beers.data;
  }, [beers.data, animateListChange]);

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <Text role="heading" {...titleScale} style={styles.heading}>
        {t("nav.catalog")}
      </Text>
      <View style={styles.controls}>
        <SearchField value={applied.query} onChange={setQuery} label={t("catalogFilters.searchLabel")} placeholder={t("catalogFilters.searchPlaceholder")} clearLabel={t("catalogFilters.clearSearch")} />
        <FiltersButton count={inForce} label={inForce > 0 ? t("catalogFilters.buttonN", { count: inForce }) : t("catalogFilters.title")} onPress={() => router.push("/filters-sheet")} />
      </View>
      <FilterChips filters={applied} onRemove={remove} onClearAll={() => apply(emptyFilters())} />
      {beers.isPending && (
        <>
          <Text style={styles.notice}>{t("catalog.loading")}</Text>
          <View style={styles.placeholders}>
            {[0, 1, 2].map((slot) => <SkeletonBlock key={slot} style={styles.placeholder} />)}
          </View>
        </>
      )}
      {beers.isError && (
        <>
          <Text style={styles.notice}>{t("catalog.list.error")}</Text>
          <ErrorReference error={beers.error} />
          <ActionButton label={t("error.retry")} onPress={() => void beers.refetch()} busy={beers.isFetching} />
        </>
      )}
      {beers.isSuccess && beers.data.length === 0 && <Text style={styles.notice}>{t("catalog.list.empty")}</Text>}
      {beers.isSuccess && beers.data.length > 0 && (
        <Reveal style={styles.list}>
          <FlatList
            data={beers.data}
            keyExtractor={(beer) => beer.id}
            maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: theme.spacing.medium }}
            refreshControl={<RefreshControl refreshing={pulled} onRefresh={pull} />}
            renderItem={({ item }) => <BeerCard beer={item} language={i18n.language} />}
          />
        </Reveal>
      )}
    </SafeAreaView>
  );
};

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    screen: { flex: 1, paddingHorizontal: theme.spacing.medium, backgroundColor: colors.background },
    heading: { ...textStyle("screen-title", "bold"), marginTop: theme.spacing.small, marginBottom: theme.spacing.medium, color: colors.foreground },
    list: { flex: 1 },
    controls: { flexDirection: "row", alignItems: "center", gap: theme.spacing.small, marginBottom: theme.spacing.small },
    placeholders: { marginTop: theme.spacing.medium },
    placeholder: { height: theme.spacing.action * 1.5, marginBottom: theme.spacing.small, borderRadius: theme.radius.card },
    notice: { ...textStyle("body", "normal"), color: colors["muted-foreground"] },
  });
};

import { theme } from "@/lib/design/theme.generated";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/EmptyState";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { ScreenTitle } from "@/components/ScreenTitle";
import { Reveal, useAnimateListChange } from "@/lib/motion";
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
    <Screen scroll={false}>
      <ScreenTitle>{t("nav.catalog")}</ScreenTitle>
      <View style={styles.controls}>
        <SearchField value={applied.query} onChange={setQuery} label={t("catalogFilters.searchLabel")} placeholder={t("catalogFilters.searchPlaceholder")} clearLabel={t("catalogFilters.clearSearch")} />
        <FiltersButton count={inForce} label={inForce > 0 ? t("catalogFilters.buttonN", { count: inForce }) : t("catalogFilters.title")} onPress={() => router.push("/filters-sheet")} />
      </View>
      <FilterChips filters={applied} onRemove={remove} onClearAll={() => apply(emptyFilters())} />
      {beers.isPending && <LoadingState label={t("catalog.loading")} placeholders={3} />}
      {beers.isError && <ErrorAlert message={t("catalog.list.error")} error={beers.error} onRetry={() => void beers.refetch()} retrying={beers.isFetching} />}
      {beers.isSuccess && beers.data.length === 0 && <EmptyState message={t("catalog.list.empty")} />}
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
    </Screen>
  );
};

const useStyles = () =>
  StyleSheet.create({
    list: { flex: 1 },
    controls: { flexDirection: "row", alignItems: "center", gap: theme.spacing.small, marginTop: theme.spacing.small, marginBottom: theme.spacing.small },
  });

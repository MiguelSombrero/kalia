import { useRouter } from "expo-router";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Keyboard, RefreshControl, StyleSheet, View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { ScreenTitle } from "@/components/ScreenTitle";
import { theme } from "@/lib/design/theme.generated";
import { Reveal } from "@/lib/motion/Reveal";
import { useAnimateListChange } from "@/lib/motion/useAnimateListChange";

import { BeerCard } from "./BeerCard";
import { FilterChips } from "./filters/FilterChips";
import { FiltersButton } from "./filters/FiltersButton";
import { type ActiveFilterKey, emptyFilters, narrowsResults, removeFilter, sheetFilterCount } from "./filters/model";
import { SearchField } from "./filters/SearchField";
import { useFiltersStore } from "./filters/store";
import { useBeers } from "./hooks/useBeers";
import { useSearchDraft } from "./hooks/useSearchDraft";
import type { BeerPage } from "./types";

export const CatalogScreen = () => {
  const { t, i18n } = useTranslation();
  const applied = useFiltersStore((state) => state.applied);
  const apply = useFiltersStore((state) => state.apply);
  const reset = useFiltersStore((state) => state.reset);
  const search = useSearchDraft();
  const { query: list, beers, refresh } = useBeers(applied);
  const router = useRouter();
  const inForce = sheetFilterCount(applied);
  const remove = (key: ActiveFilterKey) => apply(removeFilter(applied, key));
  const animateListChange = useAnimateListChange();
  const [pulled, setPulled] = useState(false);
  const pull = () => {
    setPulled(true);
    void refresh().finally(() => setPulled(false));
  };
  const shown = useRef<BeerPage | undefined>(undefined);
  const firstPage = list.data?.pages[0];

  useLayoutEffect(() => {
    if (shown.current && firstPage && shown.current !== firstPage) animateListChange();
    shown.current = firstPage;
  }, [firstPage, animateListChange]);

  const loadMore = () => {
    if (list.hasNextPage && !list.isFetchingNextPage && !list.isFetchNextPageError) void list.fetchNextPage();
  };
  const foot = list.isFetchNextPageError ? (
    <ErrorAlert message={t("catalogFilters.moreError")} error={list.error} onRetry={() => void list.fetchNextPage()} retrying={list.isFetchingNextPage} />
  ) : list.isFetchingNextPage ? (
    <LoadingState label={t("catalogFilters.loadingMore")} />
  ) : null;

  return (
    <Screen scroll={false}>
      <ScreenTitle>{t("nav.catalog")}</ScreenTitle>
      <View style={styles.controls}>
        <SearchField
          value={search.text}
          onChange={search.setText}
          onSubmit={() => {
            search.submit();
            Keyboard.dismiss();
          }}
          label={t("catalogFilters.searchLabel")}
          placeholder={t("catalogFilters.searchPlaceholder")}
          clearLabel={t("catalogFilters.clearSearch")}
        />
        <FiltersButton count={inForce} label={inForce > 0 ? t("catalogFilters.buttonN", { count: inForce }) : t("catalogFilters.title")} onPress={() => router.push("/filters-sheet")} />
      </View>
      <FilterChips filters={applied} onRemove={remove} onClearAll={() => apply(emptyFilters())} />
      {list.isPending ? <LoadingState label={t("catalog.loading")} placeholders={3} /> : null}
      {list.isError && !list.data ? <ErrorAlert message={t("catalog.list.error")} error={list.error} onRetry={() => void list.refetch()} retrying={list.isFetching} /> : null}
      {list.isSuccess && !list.isPlaceholderData && beers?.length === 0 && !narrowsResults(applied) ? <EmptyState message={t("catalog.list.empty")} /> : null}
      {list.isSuccess && !list.isPlaceholderData && beers?.length === 0 && narrowsResults(applied) ? (
        <EmptyState message={t("catalogFilters.noBeersMatch")}>
          <ActionButton variant="secondary" label={t("catalogFilters.clearSearchAndFilters")} onPress={reset} />
        </EmptyState>
      ) : null}
      {list.data && beers && beers.length > 0 ? (
        <Reveal style={styles.list}>
          <FlatList
            testID="beer-list"
            data={beers}
            keyExtractor={(beer) => beer.id}
            maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: theme.spacing.medium }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={foot ?? undefined}
            refreshControl={<RefreshControl refreshing={pulled} onRefresh={pull} />}
            renderItem={({ item }) => <BeerCard beer={item} language={i18n.language} onPress={() => router.push(`/beers/${item.id}`)} />}
          />
        </Reveal>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
  controls: { flexDirection: "row", alignItems: "center", gap: theme.spacing.small, marginTop: theme.spacing.small, marginBottom: theme.spacing.small },
});

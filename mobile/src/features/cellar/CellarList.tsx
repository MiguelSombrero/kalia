import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, FlatList, Keyboard, KeyboardAvoidingView, Pressable, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionButton } from "@/components/ActionButton";
import { EmptyState } from "@/components/EmptyState";
import { EDGE } from "@/components/metrics";
import { ScreenTitle } from "@/components/ScreenTitle";
import { SearchField } from "@/components/SearchField";
import { STACK_FROM_FONT_SCALE, textStyle } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { PressFeedback } from "@/lib/motion/PressFeedback";

import { CellarRow } from "./CellarRow";
import { EmptyCellar } from "./EmptyCellar";
import { type CellarOrder, findEntries, ORDER_LABEL_KEYS, sortEntries, totalsOf } from "./model";
import { SortMenu } from "./SortMenu";
import type { CellarEntry } from "./types";

type CellarListProps = { entries: CellarEntry[]; refreshing: boolean; onRefresh: () => void; notice?: ReactNode; onAdd: () => void; onBrowse: () => void };

export const CellarList = ({ entries, refreshing, onRefresh, notice, onAdd, onBrowse }: CellarListProps) => {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const [order, setOrder] = useState<CellarOrder>("name");
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [barHeight, setBarHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const pinned = useWindowDimensions().fontScale < STACK_FROM_FONT_SCALE;
  const shown = useMemo(() => sortEntries(findEntries(entries, text), order, i18n.language), [entries, text, order, i18n.language]);
  const totals = totalsOf(entries);
  const orderLabel = t(ORDER_LABEL_KEYS[order]);

  useEffect(() => {
    if (!menuOpen) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setMenuOpen(false);
      return true;
    });
    return () => subscription.remove();
  }, [menuOpen]);

  const bar = (
    <View style={[styles.bar, !pinned && styles.barStacked]} onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}>
      <SearchField
        value={text}
        onChange={setText}
        onSubmit={Keyboard.dismiss}
        label={t("cellarList.find.label")}
        placeholder={t("cellarList.find.placeholder")}
        clearLabel={t("cellarList.find.clear")}
      />
      <PressFeedback
        role="button"
        accessibilityLabel={t("cellarList.sortLabel", { order: orderLabel })}
        accessibilityState={{ expanded: menuOpen }}
        onPress={() => {
          Keyboard.dismiss();
          setMenuOpen((open) => !open);
        }}
        style={styles.sort}
      >
        <Text style={styles.sortLabel}>{t("cellarList.sort")}</Text>
        <Text style={styles.sortOrder}>{orderLabel}</Text>
      </PressFeedback>
    </View>
  );

  const header = (
    <View>
      <ScreenTitle>{t("nav.cellar")}</ScreenTitle>
      {notice}
      {entries.length > 0 ? (
        <Text role="summary" style={styles.totals}>
          {`${t("cellarList.totals.beers", { count: totals.beers })} · ${t("cellar.entry.bottleCount", { count: totals.bottles })}`}
        </Text>
      ) : null}
      {entries.length > 0 && !pinned ? bar : null}
    </View>
  );

  const empty =
    entries.length === 0 ? (
      <EmptyCellar onAdd={onAdd} onBrowse={onBrowse} />
    ) : (
      <EmptyState message={t("cellarList.noMatch", { query: text.trim() })}>
        <ActionButton label={t("cellarList.find.clear")} onPress={() => setText("")} variant="secondary" />
      </EmptyState>
    );

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={insets.top} style={styles.root}>
      <FlatList
        role="list"
        accessibilityLabel={t("nav.cellar")}
        data={shown}
        keyExtractor={(entry) => entry.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => <CellarRow entry={item} language={i18n.language} />}
      />
      {entries.length > 0 && pinned ? bar : null}
      {menuOpen ? (
        <View style={StyleSheet.absoluteFill} accessibilityViewIsModal onAccessibilityEscape={() => setMenuOpen(false)}>
          <Pressable accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onPress={() => setMenuOpen(false)} style={StyleSheet.absoluteFill} />
          <SortMenu
            order={order}
            bottom={pinned ? barHeight : 0}
            onClose={() => setMenuOpen(false)}
            onChoose={(choice) => {
              setOrder(choice);
              setMenuOpen(false);
            }}
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
};

const useStyles = createThemedStyles((colors) => ({
  root: { flex: 1 },
  totals: { ...textStyle("body", "medium"), color: colors.foreground, marginBottom: theme.spacing.medium },
  bar: { flexDirection: "row", alignItems: "stretch", gap: theme.spacing.small, paddingVertical: theme.spacing.small, marginBottom: theme.spacing.small },
  barStacked: { flexDirection: "column" },
  sort: { minWidth: theme.spacing.touch, minHeight: theme.spacing.touch, alignItems: "center", justifyContent: "center", paddingHorizontal: theme.spacing.medium, borderWidth: EDGE, borderColor: colors.border, borderRadius: theme.radius.card, backgroundColor: colors.surface },
  sortLabel: { ...textStyle("body", "bold"), color: colors.foreground },
  sortOrder: { ...textStyle("supporting", "medium"), color: colors["muted-foreground"] },
}));

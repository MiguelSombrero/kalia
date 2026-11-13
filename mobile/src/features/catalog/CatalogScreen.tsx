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
import { BeerCard } from "./BeerCard";
import type { BeerSummary } from "./api";
import { useBeers } from "./hooks/useBeers";

export const CatalogScreen = () => {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const beers = useBeers();
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
    placeholders: { marginTop: theme.spacing.medium },
    placeholder: { height: theme.spacing.action * 1.5, marginBottom: theme.spacing.small, borderRadius: theme.radius.card },
    notice: { ...textStyle("body", "normal"), color: colors["muted-foreground"] },
  });
};

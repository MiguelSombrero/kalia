import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { BeerSummary } from "./api";
import { useBeers } from "./hooks/useBeers";

const formatAbv = (abv: number, language: string) =>
  `${new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(abv)} %`;

export const CatalogScreen = () => {
  const { t, i18n } = useTranslation();
  const beers = useBeers();
  const retry = t("error.retry");

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <Text role="heading" style={styles.heading}>
        {t("nav.catalog")}
      </Text>
      {beers.isPending && <Text style={styles.notice}>{t("catalog.loading")}</Text>}
      {beers.isError && (
        <>
          <Text style={styles.notice}>{t("catalog.list.error")}</Text>
          <Pressable
            role="button"
            accessibilityLabel={retry}
            accessibilityState={{ busy: beers.isFetching, disabled: beers.isFetching }}
            disabled={beers.isFetching}
            onPress={() => void beers.refetch()}
            style={[styles.button, beers.isFetching && styles.buttonBusy]}
          >
            <Text style={styles.buttonText}>{retry}</Text>
          </Pressable>
        </>
      )}
      {beers.isSuccess && beers.data.length === 0 && <Text style={styles.notice}>{t("catalog.list.empty")}</Text>}
      {beers.isSuccess && beers.data.length > 0 && (
        <FlatList
          data={beers.data}
          keyExtractor={(beer) => beer.id}
          renderItem={({ item }) => <BeerRow beer={item} language={i18n.language} />}
        />
      )}
    </SafeAreaView>
  );
};

const BeerRow = ({ beer, language }: { beer: BeerSummary; language: string }) => (
  <View testID="beer-row">
    <Text style={styles.name}>{beer.name}</Text>
    <Text style={styles.details}>{`${beer.brewery.name} · ${beer.style}`}</Text>
    <Text style={styles.abv}>{formatAbv(beer.abv, language)}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, backgroundColor: "#ffffff" },
  heading: { fontSize: 28, fontWeight: "700", color: "#111111" },
  notice: { marginTop: 8, fontSize: 17, color: "#444444" },
  name: { marginTop: 16, fontSize: 19, fontWeight: "700", color: "#111111" },
  details: { fontSize: 15, color: "#444444" },
  abv: { fontSize: 15, color: "#111111" },
  button: {
    alignSelf: "flex-start",
    marginTop: 24,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#111111",
  },
  buttonBusy: { opacity: 0.5 },
  buttonText: { fontSize: 17, fontWeight: "600", color: "#ffffff" },
});

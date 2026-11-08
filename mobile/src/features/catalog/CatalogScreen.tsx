import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ErrorReference } from "@/components/ErrorReference";
import type { BeerSummary } from "./api";
import { useBeers } from "./hooks/useBeers";

const formatAbv = (abv: number, language: string) =>
  `${new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(abv)} %`;

export const CatalogScreen = () => {
  const styles = useStyles();
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
          <ErrorReference error={beers.error} />
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

const BeerRow = ({ beer, language }: { beer: BeerSummary; language: string }) => {
  const styles = useStyles();
  return (
    <View testID="beer-row">
      <Text style={styles.name}>{beer.name}</Text>
      <Text style={styles.details}>{`${beer.brewery.name} · ${beer.style}`}</Text>
      <Text style={styles.abv}>{formatAbv(beer.abv, language)}</Text>
    </View>
  );
};

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    screen: { flex: 1, padding: theme.spacing.large, backgroundColor: colors.background },
    heading: { fontSize: theme.typography.title.size, fontWeight: theme.weights.bold, color: colors.foreground },
    notice: { marginTop: theme.spacing.small, fontSize: theme.typography.body.size, color: colors["muted-foreground"] },
    name: { marginTop: theme.spacing.medium, fontSize: theme.typography.body.size, fontWeight: theme.weights.bold, color: colors.foreground },
    details: { fontSize: theme.typography.wordmark.size, color: colors["muted-foreground"] },
    abv: { fontSize: theme.typography.wordmark.size, color: colors.foreground },
    button: {
      alignSelf: "flex-start",
      marginTop: theme.spacing.large,
      minHeight: theme.spacing.touch,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.large,
      borderRadius: theme.radius.control,
      backgroundColor: colors.foreground,
    },
    buttonBusy: { opacity: 0.5 },
    buttonText: { fontSize: theme.typography.body.size, fontWeight: theme.weights.semibold, color: colors.background },
  });
};

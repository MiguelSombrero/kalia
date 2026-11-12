import { textStyle, titleScale } from "@/lib/design/fonts";
import { theme } from "@/lib/design/theme.generated";
import { useThemeColors } from "@/lib/design/useThemeColors";
import { FlatList, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ActionButton } from "@/components/ActionButton";
import { ErrorReference } from "@/components/ErrorReference";
import { BeerCard } from "./BeerCard";
import { useBeers } from "./hooks/useBeers";

export const CatalogScreen = () => {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const beers = useBeers();

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <Text role="heading" {...titleScale} style={styles.heading}>
        {t("nav.catalog")}
      </Text>
      {beers.isPending && <Text style={styles.notice}>{t("catalog.loading")}</Text>}
      {beers.isError && (
        <>
          <Text style={styles.notice}>{t("catalog.list.error")}</Text>
          <ErrorReference error={beers.error} />
          <ActionButton label={t("error.retry")} onPress={() => void beers.refetch()} busy={beers.isFetching} />
        </>
      )}
      {beers.isSuccess && beers.data.length === 0 && <Text style={styles.notice}>{t("catalog.list.empty")}</Text>}
      {beers.isSuccess && beers.data.length > 0 && (
        <FlatList
          data={beers.data}
          keyExtractor={(beer) => beer.id}
          renderItem={({ item }) => <BeerCard beer={item} language={i18n.language} />}
        />
      )}
    </SafeAreaView>
  );
};

const useStyles = () => {
  const colors = useThemeColors();
  return StyleSheet.create({
    screen: { flex: 1, paddingHorizontal: theme.spacing.medium, backgroundColor: colors.background },
    heading: { ...textStyle("screen-title", "bold"), marginTop: theme.spacing.small, marginBottom: theme.spacing.medium, color: colors.foreground },
    notice: { ...textStyle("body", "normal"), color: colors["muted-foreground"] },
  });
};

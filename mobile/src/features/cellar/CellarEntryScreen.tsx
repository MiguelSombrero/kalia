import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingState } from "@/components/LoadingState";
import { spacing } from "@/components/metrics";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/lib/auth/AuthProvider";

import { CellarEntryView } from "./CellarEntryView";
import { useCellarEntry } from "./hooks/useCellar";

export const CellarEntryScreen = () => {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { t } = useTranslation();
  const { state } = useAuth();
  const entry = useCellarEntry(id, state.status === "signedIn");
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/cellar");
  };
  const backButton = <ActionButton label={t("cellarEntry.back")} onPress={back} />;

  if (state.status === "signedOut") return <Redirect href="/cellar" />;
  if (entry.data) {
    const { data } = entry;
    return (
      <Screen scroll={false}>
        <CellarEntryView entry={data} onBack={back} onAdd={() => router.push("/add-sheet")} onSeeInCatalog={() => router.push({ pathname: "/beers/[id]", params: { id: data.beer.id } })} />
      </Screen>
    );
  }
  return (
    <Screen>
      {entry.data === null ? (
        <EmptyState message={t("cellarEntry.notFound")}>{backButton}</EmptyState>
      ) : (
        <View style={spacing.blocks}>
          {entry.isError ? (
            <ErrorAlert message={t("cellarList.loadFailed")} error={entry.error} onRetry={() => void entry.refetch()} retrying={entry.isFetching} />
          ) : (
            <LoadingState label={t("cellar.loading")} placeholders={3} />
          )}
          {backButton}
        </View>
      )}
    </Screen>
  );
};

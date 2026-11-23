import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingState } from "@/components/LoadingState";
import { spacing } from "@/components/metrics";
import { Screen } from "@/components/Screen";
import { ScreenTitle } from "@/components/ScreenTitle";

import { CellarList } from "./CellarList";
import { useCellar } from "./hooks/useCellar";

export const SignedInCellar = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const cellar = useCellar();
  const [pulled, setPulled] = useState(false);
  const pull = () => {
    setPulled(true);
    void cellar.refetch().finally(() => setPulled(false));
  };

  if (!cellar.data) {
    return (
      <Screen>
        <View style={spacing.blocks}>
          <ScreenTitle>{t("nav.cellar")}</ScreenTitle>
          {cellar.isError ? (
            <ErrorAlert message={t("cellarList.loadFailed")} error={cellar.error} onRetry={() => void cellar.refetch()} retrying={cellar.isFetching} />
          ) : (
            <LoadingState label={t("cellar.loading")} placeholders={3} />
          )}
        </View>
      </Screen>
    );
  }
  return (
    <Screen scroll={false}>
      <CellarList
        entries={cellar.data}
        refreshing={pulled}
        onRefresh={pull}
        notice={
          cellar.isError ? (
            <ErrorAlert message={t("cellarList.refreshFailed")} error={cellar.error} onRetry={() => void cellar.refetch()} retrying={cellar.isFetching} />
          ) : null
        }
        onAdd={() => router.push("/add-sheet")}
        onBrowse={() => router.navigate("/catalog")}
      />
    </Screen>
  );
};

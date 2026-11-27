import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ActionButton } from "@/components/ActionButton";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";

import { CellarEntryView } from "./CellarEntryView";
import { sampleCellar } from "./sampleCellar";

export const CellarEntryScreen = () => {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { t } = useTranslation();
  const entry = sampleCellar.find((candidate) => candidate.id === id);
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/cellar");
  };

  return (
    <Screen scroll={false}>
      {entry ? (
        <CellarEntryView entry={entry} onBack={back} onAdd={() => router.push("/add-sheet")} onSeeInCatalog={() => router.push({ pathname: "/beers/[id]", params: { id: entry.beer.id } })} />
      ) : (
        <EmptyState message={t("cellarEntry.notFound")}>
          <ActionButton label={t("cellarEntry.back")} onPress={back} />
        </EmptyState>
      )}
    </Screen>
  );
};

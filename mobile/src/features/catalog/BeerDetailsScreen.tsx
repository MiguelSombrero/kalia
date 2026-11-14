import { useLocalSearchParams, useRouter } from "expo-router";
import { showCatalogWith, type CatalogLinkFilter } from "@/lib/catalogLink";
import { BeerDetails } from "./details/BeerDetails";

export const BeerDetailsScreen = () => {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/catalog");
  };
  const showAndClose = (filter: CatalogLinkFilter) => {
    showCatalogWith(filter);
    close();
  };
  return (
    <BeerDetails
      key={id}
      id={id}
      onClose={close}
      onOpenBeer={(other) => router.setParams({ id: other })}
      onShowStyle={(style) => showAndClose({ style })}
      onShowBrewery={({ id: breweryId, name }) => showAndClose({ brewery: { id: breweryId, name } })}
      onShowCountry={(country) => showAndClose({ country })}
    />
  );
};

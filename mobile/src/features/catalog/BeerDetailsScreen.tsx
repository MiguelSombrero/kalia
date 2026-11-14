import { useLocalSearchParams, useRouter } from "expo-router";
import { BeerDetails } from "./details/BeerDetails";

export const BeerDetailsScreen = () => {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/catalog");
  };
  return (
    <BeerDetails
      key={id}
      id={id}
      onClose={close}
      onOpenBeer={(other) => router.setParams({ id: other })}
      onShowStyle={() => undefined}
      onShowBrewery={() => undefined}
      onShowCountry={() => undefined}
    />
  );
};

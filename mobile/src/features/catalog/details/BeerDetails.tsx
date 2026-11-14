import { useTranslation } from "react-i18next";
import { ActionButton } from "@/components/ActionButton";
import { BodyText } from "@/components/BodyText";
import { EmptyState } from "@/components/EmptyState";
import { ErrorAlert } from "@/components/ErrorAlert";
import { FieldRow } from "@/components/FieldRow";
import { LoadingState } from "@/components/LoadingState";
import { Sheet } from "@/components/Sheet";
import { countryName } from "@/lib/i18n/countryNames";
import type { BeerDetails as BeerDetailsData } from "../api";
import { useBeer, useSimilarBeers } from "../hooks/useBeer";
import { BeerHeadline } from "./BeerHeadline";
import { CellarAction } from "./CellarAction";
import { InfoRow } from "./InfoRow";
import { SimilarBeers } from "./SimilarBeers";
import { statusLabelKey } from "./status";

export type BeerDetailsProps = {
  id: string;
  onClose: () => void;
  onOpenBeer: (id: string) => void;
  onShowStyle: (style: string) => void;
  onShowBrewery: (brewery: BeerDetailsData["brewery"]) => void;
  onShowCountry: (countryCode: string) => void;
};

export const BeerDetails = ({ id, onClose, onOpenBeer, onShowStyle, onShowBrewery, onShowCountry }: BeerDetailsProps) => {
  const { t, i18n } = useTranslation();
  const beer = useBeer(id);
  const similar = useSimilarBeers(beer.data);
  const shown = beer.data;
  const status = shown ? statusLabelKey(shown.status) : null;
  const country = shown ? countryName(shown.brewery.countryCode, i18n.language) : "";

  return (
    <Sheet title={t("beerDetails.title")} closeLabel={t("mobileNavigation.close")} onClose={onClose}>
      {beer.isPending && <LoadingState label={t("beerDetails.loading")} placeholders={2} />}
      {beer.isError && <ErrorAlert message={t("beerDetails.error")} error={beer.error} onRetry={() => void beer.refetch()} retrying={beer.isFetching} />}
      {beer.isSuccess && beer.data === null && (
        <EmptyState message={t("beerDetails.notFound.message")}>
          <ActionButton label={t("beerDetails.notFound.action")} onPress={onClose} />
        </EmptyState>
      )}
      {shown ? (
        <>
          <BeerHeadline name={shown.name} style={shown.style} abv={shown.abv} language={i18n.language} />
          {status ? <BodyText tone="muted" spaced>{t(status)}</BodyText> : null}
          <FieldRow title={t("beerDetails.style")} value={shown.style} empty={false} accessibilityLabel={t("beerDetails.showStyle", { value: shown.style })} onPress={() => onShowStyle(shown.style)} />
          <FieldRow title={t("beerDetails.brewery")} value={shown.brewery.name} empty={false} accessibilityLabel={t("beerDetails.showBrewery", { value: shown.brewery.name })} onPress={() => onShowBrewery(shown.brewery)} />
          {shown.brewery.city ? <InfoRow title={t("beerDetails.city")} value={shown.brewery.city} /> : null}
          <FieldRow title={t("beerDetails.country")} value={country} empty={false} accessibilityLabel={t("beerDetails.showCountry", { value: country })} onPress={() => onShowCountry(shown.brewery.countryCode)} />
          {similar.data && similar.data.length > 0 ? <SimilarBeers beers={similar.data} language={i18n.language} onOpen={onOpenBeer} /> : null}
          <CellarAction />
        </>
      ) : null}
    </Sheet>
  );
};

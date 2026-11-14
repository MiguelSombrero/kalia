import { useQuery } from "@tanstack/react-query";
import { readBeer, readSimilarBeers, type BeerDetails } from "../api";

export const useBeer = (id: string) => useQuery({ queryKey: ["catalog", "beer", id], queryFn: () => readBeer(id), retry: false });

/** Never an error state of the page: a section that failed is a section left out. */
export const useSimilarBeers = (beer: BeerDetails | null | undefined) =>
  useQuery({
    queryKey: ["catalog", "similar-beers", beer?.style, beer?.id],
    queryFn: () => readSimilarBeers(beer!.style, beer!.id),
    enabled: !!beer,
    retry: false,
  });

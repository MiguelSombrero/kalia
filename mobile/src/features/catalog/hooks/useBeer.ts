import { queryOptions, useQuery } from "@tanstack/react-query";

import { readBeer, readSimilarBeers } from "../api";
import type { BeerDetails } from "../types";

export const beerQuery = (id: string) => queryOptions({ queryKey: ["catalog", "beer", id], queryFn: () => readBeer(id) });

export const similarBeersQuery = (beer: BeerDetails | null | undefined) =>
  queryOptions({
    queryKey: ["catalog", "similar-beers", beer?.style, beer?.id],
    queryFn: () => readSimilarBeers(beer!.style, beer!.id),
    enabled: !!beer,
  });

export const useBeer = (id: string) => useQuery(beerQuery(id));

/** Never an error state of the page: a section that failed is a section left out. */
export const useSimilarBeers = (beer: BeerDetails | null | undefined) => useQuery(similarBeersQuery(beer));

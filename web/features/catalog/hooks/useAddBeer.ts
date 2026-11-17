import { keepPreviousData, queryOptions, useMutation, useQuery } from "@tanstack/react-query";

import {
  addBeerAction,
  findBreweriesAction,
  findSimilarBeersAction,
  loadAddBeerOptionsAction,
} from "../actions";
import type { AddBeerRequest } from "../types";

export const addBeerOptionsQuery = (locale: string) =>
  queryOptions({
    queryKey: ["catalog", "addBeerOptions", locale],
    queryFn: () => loadAddBeerOptionsAction(locale),
    staleTime: Infinity,
  });

export const breweryMatchesQuery = (query: string, locale: string) =>
  queryOptions({
    queryKey: ["catalog", "breweries", locale, query],
    queryFn: () => findBreweriesAction(query, locale),
    enabled: query.trim() !== "",
    placeholderData: keepPreviousData,
  });

export const similarBeersQuery = (breweryId: string, beerName: string) =>
  queryOptions({
    queryKey: ["catalog", "similarBeers", breweryId, beerName],
    queryFn: () => findSimilarBeersAction(breweryId, beerName),
    enabled: breweryId !== "" && beerName.trim() !== "",
    // Across keystrokes only: another brewery's beers must never stand in under this one's heading.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === breweryId ? previous : undefined,
  });

export const useAddBeerOptions = (locale: string, enabled: boolean) =>
  useQuery({ ...addBeerOptionsQuery(locale), enabled });

export const useBreweryMatches = (query: string, locale: string) => useQuery(breweryMatchesQuery(query, locale));

export const useSimilarBeers = (breweryId: string, beerName: string) =>
  useQuery(similarBeersQuery(breweryId, beerName));

export const useAddBeer = () =>
  useMutation({
    mutationFn: (variables: { request: AddBeerRequest; locale: string }) =>
      addBeerAction(variables.request, variables.locale),
  });

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import {
  addBeerAction,
  findBreweriesAction,
  findSimilarBeersAction,
  loadAddBeerOptionsAction,
} from "../actions";
import type { AddBeerRequest } from "../types";

const catalogKey = ["catalog"] as const;

export const useAddBeerOptions = (locale: string, enabled: boolean) =>
  useQuery({
    queryKey: [...catalogKey, "addBeerOptions", locale],
    queryFn: () => loadAddBeerOptionsAction(locale),
    enabled,
    staleTime: Infinity,
  });

export const useBreweryMatches = (query: string, locale: string) =>
  useQuery({
    queryKey: [...catalogKey, "breweries", locale, query],
    queryFn: () => findBreweriesAction(query, locale),
    enabled: query.trim() !== "",
    placeholderData: keepPreviousData,
  });

export const useSimilarBeers = (breweryId: string, beerName: string) =>
  useQuery({
    queryKey: [...catalogKey, "similarBeers", breweryId, beerName],
    queryFn: () => findSimilarBeersAction(breweryId, beerName),
    enabled: breweryId !== "" && beerName.trim() !== "",
    // Across keystrokes only: another brewery's beers must never stand in under this one's heading.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === breweryId ? previous : undefined,
  });

export const useAddBeer = () =>
  useMutation({
    mutationFn: (variables: { request: AddBeerRequest; locale: string }) =>
      addBeerAction(variables.request, variables.locale),
  });

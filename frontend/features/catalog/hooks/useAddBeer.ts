import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import {
  addBeerAction,
  findBreweriesAction,
  listBreweryBeersAction,
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

export const useBreweryBeers = (breweryId: string) =>
  useQuery({
    queryKey: [...catalogKey, "breweryBeers", breweryId],
    queryFn: () => listBreweryBeersAction(breweryId),
    enabled: breweryId !== "",
  });

export const useAddBeer = () =>
  useMutation({
    mutationFn: (variables: { request: AddBeerRequest; locale: string }) =>
      addBeerAction(variables.request, variables.locale),
  });

import { useQuery } from "@tanstack/react-query";
import { readFirstBeerPage } from "../api";

export const beersKey = ["catalog", "beers", "first-page"] as const;

export const useBeers = () => useQuery({ queryKey: beersKey, queryFn: readFirstBeerPage, retry: false });

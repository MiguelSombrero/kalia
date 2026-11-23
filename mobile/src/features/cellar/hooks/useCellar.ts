import { queryOptions, useQuery } from "@tanstack/react-query";

import { readCellar } from "../api";

export const cellarQuery = () => queryOptions({ queryKey: ["cellar", "entries"], queryFn: readCellar });

export const useCellar = () => useQuery(cellarQuery());

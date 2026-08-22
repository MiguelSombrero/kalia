import { useQuery } from "@tanstack/react-query";
import { listCellarBottlesAction } from "../actions";

export const useCellarBottles = (entryId: string, options: { enabled: boolean }) => {
  return useQuery({
    queryKey: ["cellar", "bottles", entryId],
    queryFn: () => listCellarBottlesAction(entryId),
    enabled: options.enabled,
  });
};

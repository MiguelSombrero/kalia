import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addBottlesAction, listCellarBottlesAction } from "../actions";
import type { AddBottlesRequest, Bottle } from "../types";

const bottlesKey = (entryId: string) => ["cellar", "bottles", entryId];

export const useCellarBottles = (entryId: string, options: { enabled: boolean }) => {
  return useQuery({
    queryKey: bottlesKey(entryId),
    queryFn: () => listCellarBottlesAction(entryId),
    enabled: options.enabled,
  });
};

export const useAddBottle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AddBottlesRequest) => addBottlesAction(request),
    onSuccess: (created: Bottle[]) => {
      const entryId = created[0]?.entryId;
      if (entryId) {
        queryClient.invalidateQueries({ queryKey: bottlesKey(entryId) });
      }
    },
  });
};

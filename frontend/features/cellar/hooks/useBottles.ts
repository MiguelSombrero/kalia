import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addBottlesAction,
  listCellarBottlesAction,
  removeBottleAction,
  updateBottleAction,
} from "../actions";
import type { AddBottlesRequest, Bottle, UpdateBottleRequest } from "../types";

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

export const useUpdateBottle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; request: UpdateBottleRequest }) =>
      updateBottleAction(variables.id, variables.request),
    onSuccess: (updated: Bottle) => {
      queryClient.invalidateQueries({ queryKey: bottlesKey(updated.entryId) });
    },
  });
};

export const useRemoveBottle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; entryId: string }) => removeBottleAction(variables.id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bottlesKey(variables.entryId) });
    },
  });
};

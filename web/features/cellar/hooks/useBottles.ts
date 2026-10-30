import { useMutation } from "@tanstack/react-query";
import { addBottlesAction, removeBottleAction, updateBottleAction } from "../actions";
import type { AddBottlesRequest, UpdateBottleRequest } from "../types";

// Each action revalidates the cellar page itself, so the refreshed render
// carries the change; there is no client-side bottle cache to invalidate.

export const useAddBottle = () =>
  useMutation({ mutationFn: (request: AddBottlesRequest) => addBottlesAction(request) });

export const useUpdateBottle = () =>
  useMutation({
    mutationFn: (variables: { id: string; request: UpdateBottleRequest }) =>
      updateBottleAction(variables.id, variables.request),
  });

export const useRemoveBottle = () =>
  useMutation({ mutationFn: (variables: { id: string }) => removeBottleAction(variables.id) });

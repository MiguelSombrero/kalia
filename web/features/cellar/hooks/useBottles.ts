import { useMutation } from "@tanstack/react-query";
import { addBottlesAction, removeBottleAction, updateBottleAction } from "../actions";
import { unlessConflicted } from "../conflict";
import type { AddBottlesRequest, UpdateBottleRequest } from "../types";

// Each action revalidates the cellar page itself, so the refreshed render
// carries the change; there is no client-side bottle cache to invalidate.

export const useAddBottle = () =>
  useMutation({ mutationFn: async (request: AddBottlesRequest) => unlessConflicted(await addBottlesAction(request)) });

export const useUpdateBottle = () =>
  useMutation({
    mutationFn: async (variables: { id: string; request: UpdateBottleRequest }) =>
      unlessConflicted(await updateBottleAction(variables.id, variables.request)),
  });

export const useRemoveBottle = () =>
  useMutation({ mutationFn: async (variables: { id: string }) => unlessConflicted(await removeBottleAction(variables.id)) });

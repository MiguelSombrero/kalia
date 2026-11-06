import { apiError } from "@kalia/api";
import { useMutation } from "@tanstack/react-query";
import { removeBeerAction } from "../actions";

export const useRemoveBeer = () =>
  useMutation({
    mutationFn: async (variables: { id: string }) => {
      const result = await removeBeerAction(variables.id);
      if (result.kind === "refused") {
        throw apiError("http", `Removing the beer was refused with status ${result.status}`, { status: result.status });
      }
    },
  });

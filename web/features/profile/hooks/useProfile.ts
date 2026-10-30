import { useMutation } from "@tanstack/react-query";
import { changeVisibilityAction } from "../actions";

export const useChangeVisibility = () => {
  return useMutation({
    mutationFn: (cellarPublic: boolean) => changeVisibilityAction(cellarPublic),
  });
};

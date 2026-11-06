import { useMutation } from "@tanstack/react-query";
import { approveEditedSuggestionAction, approveSuggestionAction, rejectSuggestionAction } from "../actions";
import type { EditSuggestionRequest, RejectionReason } from "../types";

// Each action revalidates the admin page itself, so the refreshed render carries
// the queue; there is no client-side queue cache to invalidate.

export const useApproveSuggestion = () =>
  useMutation({ mutationFn: (variables: { id: string }) => approveSuggestionAction(variables.id) });

export const useRejectSuggestion = () =>
  useMutation({
    mutationFn: (variables: { id: string; reason: RejectionReason }) =>
      rejectSuggestionAction(variables.id, variables.reason),
  });

export const useApproveEditedSuggestion = () =>
  useMutation({
    mutationFn: (variables: { id: string; request: EditSuggestionRequest }) =>
      approveEditedSuggestionAction(variables.id, variables.request),
  });

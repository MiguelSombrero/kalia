import { httpFailure } from "@kalia/api";
import {
  approve as generatedApprove,
  approveEdited as generatedApproveEdited,
  listSuggestions as generatedListSuggestions,
  reject as generatedReject,
} from "@kalia/api/generated/admin-suggestions/admin-suggestions";

import type { DecisionResult, EditResult, EditSuggestionRequest, RejectionReason, SuggestionPage } from "./types";

export const QUEUE_PAGE_SIZE = 20;

/** `page` is zero-based, as the API's. */
export const listSuggestions = async (page: number): Promise<SuggestionPage> => {
  const response = await generatedListSuggestions({ page, size: QUEUE_PAGE_SIZE });
  if (response.status !== 200) {
    throw httpFailure("Listing suggestions", response);
  }
  return response.data;
};

/** A 401, a 403 or a 5xx is a failure to decide, not an answer about the suggestion, and throws. */
export const approveSuggestion = async (id: string): Promise<DecisionResult> => {
  const response = await generatedApprove(id);
  switch (response.status) {
    case 200:
      return { kind: "decided", decision: response.data };
    case 404:
      return { kind: "gone" };
    case 409:
      return { kind: "alreadyDecided", outcome: response.data.outcome, decidedAt: response.data.decidedAt };
    default:
      throw httpFailure("Approving a suggestion", response);
  }
};

export const rejectSuggestion = async (id: string, reason: RejectionReason): Promise<DecisionResult> => {
  const response = await generatedReject(id, { reason });
  switch (response.status) {
    case 200:
      return { kind: "decided", decision: response.data };
    case 404:
      return { kind: "gone" };
    case 409:
      return { kind: "alreadyDecided", outcome: response.data.outcome, decidedAt: response.data.decidedAt };
    default:
      throw httpFailure("Rejecting a suggestion", response);
  }
};

export const approveEditedSuggestion = async (id: string, request: EditSuggestionRequest): Promise<EditResult> => {
  const response = await generatedApproveEdited(id, request);
  switch (response.status) {
    case 200:
      return { kind: "decided", decision: response.data };
    case 400:
      return { kind: "refused", fields: "errors" in response.data ? response.data.errors : [] };
    case 404:
      return { kind: "gone" };
    case 409: {
      const problem = response.data;
      if ("outcome" in problem) {
        return { kind: "alreadyDecided", outcome: problem.outcome, decidedAt: problem.decidedAt };
      }
      if ("existingBeerId" in problem) {
        return { kind: "duplicateBeer", existingBeerId: problem.existingBeerId };
      }
      if ("existingBreweryId" in problem) {
        return {
          kind: "duplicateBrewery",
          existing: {
            id: problem.existingBreweryId,
            name: problem.existingBreweryName,
            countryCode: problem.existingBreweryCountryCode,
          },
        };
      }
      return { kind: "breweryApproved" };
    }
    default:
      throw httpFailure("Approving an edited suggestion", response);
  }
};

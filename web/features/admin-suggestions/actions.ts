"use server";

import { revalidatePath } from "next/cache";
import { approveEditedSuggestion, approveSuggestion, rejectSuggestion } from "./api";
import type { DecisionResult, EditResult, EditSuggestionRequest, RejectionReason } from "./types";

// Whatever the answer, the queue has changed or was already out of date, and an
// approved beer is now in the catalog's pages.
const refreshPages = (result: DecisionResult | EditResult) => {
  revalidatePath("/[locale]/admin", "page");
  if (result.kind === "decided" && result.decision.outcome === "APPROVED") {
    revalidatePath("/[locale]/beers", "page");
    revalidatePath("/[locale]/beers/[id]", "page");
  }
};

export const approveSuggestionAction = async (id: string): Promise<DecisionResult> => {
  const result = await approveSuggestion(id);
  refreshPages(result);
  return result;
};

export const rejectSuggestionAction = async (id: string, reason: RejectionReason): Promise<DecisionResult> => {
  const result = await rejectSuggestion(id, reason);
  refreshPages(result);
  return result;
};

export const approveEditedSuggestionAction = async (id: string, request: EditSuggestionRequest): Promise<EditResult> => {
  const result = await approveEditedSuggestion(id, request);
  if (result.kind === "decided" || result.kind === "alreadyDecided" || result.kind === "gone") {
    refreshPages(result);
  }
  return result;
};

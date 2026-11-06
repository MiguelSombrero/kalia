import type {
  EditSuggestionRequestDto,
  PageDtoSuggestionDto,
  RejectSuggestionRequestDtoReason,
  SuggestionAlreadyDecidedProblemOutcome,
  SuggestionDecisionDto,
  SuggestionDto,
} from "@kalia/api/generated/models";

export type {
  EditSuggestionRequestDto as EditSuggestionRequest,
  PageDtoSuggestionDto as SuggestionPage,
  SuggestionDecisionDto as SuggestionDecision,
  SuggestionDto as Suggestion,
};

type SuggestionDecision = SuggestionDecisionDto;

export type RejectionReason = RejectSuggestionRequestDtoReason;
export const REJECTION_REASONS = ["ALREADY_IN_CATALOG", "NOT_A_REAL_BEER", "INAPPROPRIATE", "INCORRECT_DETAILS"] as const satisfies readonly RejectionReason[];

export type DecidedOutcome = SuggestionAlreadyDecidedProblemOutcome;

/** A field the server refused, named by its path in the request (`newBrewery.countryCode`). */
export type FieldRefusal = { field: string; message: string };

export type DecisionResult =
  | { kind: "decided"; decision: SuggestionDecision }
  | { kind: "alreadyDecided"; outcome: DecidedOutcome; decidedAt?: string }
  | { kind: "gone" };

export type EditResult =
  | DecisionResult
  | { kind: "refused"; fields: FieldRefusal[] }
  | { kind: "duplicateBeer"; existingBeerId: string }
  | { kind: "duplicateBrewery"; existing: { id: string; name: string; countryCode: string } }
  | { kind: "breweryApproved" };

export type BreweryOption = { id: string; name: string; place: string };

export type EditOptions = { styles: string[]; countries: { code: string; name: string }[] };

export type SuggestionRow = {
  id: string;
  name: string;
  style: string;
  abv: number;
  brewery: { id: string; name: string; countryCode: string; city?: string; place: string };
  breweryIsNew: boolean;
  /** Absent when the contributor has no profile yet. */
  username?: string;
  pendingCount: number;
  rejectedCount: number;
  suggestedAt: string;
  waited: string;
};

export type QueuePage = { rows: SuggestionRow[]; page: number; totalPages: number; totalElements: number };

export type Outcome =
  | { kind: "decided"; decision: SuggestionDecision; suggestion: SuggestionRow; edited: boolean }
  | { kind: "alreadyDecided"; suggestion: SuggestionRow; outcome: DecidedOutcome; decidedAt?: string }
  | { kind: "gone"; suggestion: SuggestionRow };

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

/** What a decision answered, short of a failure to answer at all. */
export type DecisionResult =
  | { kind: "decided"; decision: SuggestionDecision }
  | { kind: "alreadyDecided"; outcome: DecidedOutcome; decidedAt?: string }
  | { kind: "gone" };

/** What an edited approval answered: the refusals only an edit meets, besides a decision's. */
export type EditResult =
  | DecisionResult
  | { kind: "refused"; fields: FieldRefusal[] }
  | { kind: "duplicateBeer"; existingBeerId: string }
  | { kind: "duplicateBrewery"; existing: { id: string; name: string; countryCode: string } }
  | { kind: "breweryApproved" };

/** A brewery as the edit form offers it, its place already named in the reader's language. */
export type BreweryOption = { id: string; name: string; place: string };

/** What the edit form needs before it can be filled in. */
export type EditOptions = { styles: string[]; countries: { code: string; name: string }[] };

/** A suggestion as the page shows it: places named and the wait worded on the server. */
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

/** What the page does with the beer it just decided, and shows in the suggestion's place. */
export type Outcome =
  | { kind: "decided"; decision: SuggestionDecision; suggestion: SuggestionRow; edited: boolean }
  | { kind: "alreadyDecided"; suggestion: SuggestionRow; outcome: DecidedOutcome; decidedAt?: string }
  | { kind: "gone"; suggestion: SuggestionRow };

import { apiError, isApiError } from "@kalia/api";

export type CellarConflict = { conflict: true };

const CONFLICT_STATUS = 409;

// The 409 of ADR-0057. A Server Action's thrown error loses `kind` and
// `status` on the way to the client, so the action returns the conflict instead.
export const lostToConcurrentChange = async <T>(write: () => Promise<T>): Promise<T | CellarConflict> => {
  try {
    return await write();
  } catch (error) {
    if (isApiError(error) && error.kind === "http" && error.status === CONFLICT_STATUS) {
      return { conflict: true };
    }
    throw error;
  }
};

export const isConflictResult = (result: unknown): result is CellarConflict =>
  typeof result === "object" && result !== null && "conflict" in result;

export const unlessConflicted = <T>(result: T | CellarConflict): T => {
  if (isConflictResult(result)) {
    throw apiError("http", "A cellar write lost to a concurrent change", { status: CONFLICT_STATUS });
  }
  return result;
};

export const isCellarConflict = (error: unknown): boolean =>
  isApiError(error) && error.kind === "http" && error.status === CONFLICT_STATUS;

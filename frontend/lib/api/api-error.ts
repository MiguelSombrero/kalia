/** Tagged so callers can react without string-matching a message. */
export type ApiErrorKind = "network" | "timeout" | "http" | "parse";

export type ApiError = Error & {
  name: "ApiError";
  kind: ApiErrorKind;
  /** Set for `http` and `parse`; absent for `network` and `timeout`. */
  status?: number;
};

/**
 * Decorates a real `Error` rather than subclassing: a class constructor is a
 * function expression, which this frontend avoids (frontend/README.md).
 * Staying an `Error` is load-bearing — the Next.js error boundary and stack
 * traces both depend on it.
 */
export const apiError = (
  kind: ApiErrorKind,
  message: string,
  options: { status?: number; cause?: unknown } = {},
): ApiError =>
  Object.assign(new Error(message, { cause: options.cause }), {
    name: "ApiError" as const,
    kind,
    status: options.status,
  });

export const isApiError = (error: unknown): error is ApiError =>
  // Both checks matter: the name alone would let any Error borrowing it
  // through, and this guard promises callers a `kind` to branch on.
  error instanceof Error && error.name === "ApiError" && "kind" in error;

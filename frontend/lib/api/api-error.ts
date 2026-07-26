/**
 * What went wrong with an API call, tagged so callers can react without
 * string-matching a message:
 *
 * - `network` — the request never reached the backend
 * - `timeout` — the backend did not answer in time
 * - `http` — the backend answered with a status the caller cannot use
 * - `parse` — the backend answered, but the body was not JSON
 */
export type ApiErrorKind = "network" | "timeout" | "http" | "parse";

export type ApiError = Error & {
  name: "ApiError";
  kind: ApiErrorKind;
  /**
   * Set when a response was actually received (`http` and `parse`), and
   * `undefined` for `network` and `timeout`, where there was never a status.
   */
  status?: number;
};

/**
 * Built by decorating a real `Error` rather than by subclassing it: the
 * frontend prefers arrow functions to function expressions
 * (frontend/README.md), and a class constructor is one. Staying an `Error`
 * matters — the Next.js error boundary and stack traces both depend on it.
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

/** Tagged so callers can react without string-matching a message. */
export type ApiErrorKind = "network" | "timeout" | "http" | "parse";

export type ApiError = Error & {
  name: "ApiError";
  kind: ApiErrorKind;
  /** Set for `http` and `parse`; absent for `network` and `timeout`. */
  status?: number;
};

// Decorates a real `Error` rather than subclassing (ADR-0037) — staying an
// `Error` is load-bearing for the Next.js error boundary and stack traces.
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
  // Both checks matter: name alone would let any Error borrowing it through.
  error instanceof Error && error.name === "ApiError" && "kind" in error;

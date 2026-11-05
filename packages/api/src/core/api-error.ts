/** Tagged so callers can react without string-matching a message. */
export type ApiErrorKind = "network" | "timeout" | "http" | "parse" | "refused";

export type ApiError = Error & {
  name: "ApiError";
  kind: ApiErrorKind;
  /** Set for `http` and `parse`; absent for the rest. */
  status?: number;
  /** The trace the failed call belonged to; the backend's log lines for it carry the same id. */
  traceId?: string;
};

// Decorates a real `Error` rather than subclassing (ADR-0037) — staying an
// `Error` is load-bearing for the Next.js error boundary and stack traces.
export const apiError = (
  kind: ApiErrorKind,
  message: string,
  options: { status?: number; cause?: unknown; traceId?: string } = {},
): ApiError =>
  Object.assign(new Error(options.traceId ? `${message} (trace ${options.traceId})` : message, { cause: options.cause }), {
    name: "ApiError" as const,
    kind,
    status: options.status,
    traceId: options.traceId,
  });

export const isApiError = (error: unknown): error is ApiError =>
  // Both checks matter: name alone would let any Error borrowing it through.
  error instanceof Error && error.name === "ApiError" && "kind" in error;

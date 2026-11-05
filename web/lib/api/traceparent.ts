import { newTraceparent as startTrace, traceIdOf, type Traceparent } from "@kalia/api";

export { traceIdOf, type Traceparent };

const randomBytes = (bytes: number): Uint8Array => crypto.getRandomValues(new Uint8Array(bytes));

/** A `traceparent` that starts a new trace. */
export const newTraceparent = (): Traceparent => startTrace(randomBytes);

/**
 * What to send the backend for a request that arrived with `incoming`: that
 * header unchanged when it is valid, else a new trace. Unchanged on purpose —
 * a fresh span id per call would make identical GETs in one render differ and
 * defeat Next's request memoization (see withTimeout in mutator.ts); the
 * request's span is the parent of every call it makes anyway.
 */
export const traceparentFor = (incoming: string | null | undefined): Traceparent => {
  const traceId = traceIdOf(incoming);
  return traceId && incoming ? { header: incoming.trim().toLowerCase(), traceId } : newTraceparent();
};

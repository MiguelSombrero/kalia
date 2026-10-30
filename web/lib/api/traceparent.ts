// W3C Trace Context (https://www.w3.org/TR/trace-context/), version 00 only.
const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;

const ALL_ZEROS = /^0+$/;

export type Traceparent = { header: string; traceId: string };

const randomHex = (bytes: number): string => {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  const hex = Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
  // An all-zero id is invalid on the wire; one in 2^64 is not worth a loop.
  return ALL_ZEROS.test(hex) ? `${hex.slice(0, -1)}1` : hex;
};

/** The trace id of a well-formed `traceparent`, else `undefined`. */
export const traceIdOf = (header: string | null | undefined): string | undefined => {
  const match = TRACEPARENT.exec(header?.trim().toLowerCase() ?? "");
  return match && !ALL_ZEROS.test(match[1]) && !ALL_ZEROS.test(match[2]) ? match[1] : undefined;
};

/** A `traceparent` that starts a new trace. */
export const newTraceparent = (): Traceparent => {
  const traceId = randomHex(16);
  return { header: `00-${traceId}-${randomHex(8)}-01`, traceId };
};

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

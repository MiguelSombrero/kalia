// W3C Trace Context (https://www.w3.org/TR/trace-context/), version 00 only.
const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;

const ALL_ZEROS = /^0+$/;

export type Traceparent = { header: string; traceId: string };

/** Fills and returns `bytes` random bytes; each app supplies the platform's own source. */
export type RandomBytes = (bytes: number) => Uint8Array;

const randomHex = (random: RandomBytes, bytes: number): string => {
  const hex = Array.from(random(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
  // An all-zero id is invalid on the wire; one in 2^64 is not worth a loop.
  return ALL_ZEROS.test(hex) ? `${hex.slice(0, -1)}1` : hex;
};

/** The trace id of a well-formed `traceparent`, else `undefined`. */
export const traceIdOf = (header: string | null | undefined): string | undefined => {
  const match = TRACEPARENT.exec(header?.trim().toLowerCase() ?? "");
  return match && !ALL_ZEROS.test(match[1]) && !ALL_ZEROS.test(match[2]) ? match[1] : undefined;
};

/** A `traceparent` that starts a new trace. */
export const newTraceparent = (random: RandomBytes): Traceparent => {
  const traceId = randomHex(random, 16);
  return { header: `00-${traceId}-${randomHex(random, 8)}-01`, traceId };
};

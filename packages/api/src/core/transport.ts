/**
 * What the generated client calls for every request: the URL orval built and
 * the options it chose. Resolves to `{ data, status, headers }` typed by the
 * generated response union, so a non-2xx status is a return value.
 */
export type Transport = <T>(url: string, options: RequestInit) => Promise<T>;

// On globalThis, not in a module variable: a bundler may instantiate this
// module more than once (Next.js compiles each server layer separately, and
// a dev reload re-evaluates it), and the registration happens in one of them.
const SLOT = Symbol.for("@kalia/api.transport");

type Holder = { [SLOT]?: Transport };

/** Called once at startup by each app, before the first request. */
export const registerTransport = (transport: Transport): void => {
  (globalThis as Holder)[SLOT] = transport;
};

/** The mutator the generated client imports (`override.mutator` in orval.config.ts, which orval must read this file directly). */
// An explicit signature rather than `: Transport`, because orval reads the
// options type off this function to type each operation's `request` option.
export const kaliaFetch = <T,>(url: string, options: RequestInit): Promise<T> => {
  const transport = (globalThis as Holder)[SLOT];
  if (!transport) {
    throw new Error(
      `No transport registered for @kalia/api: call registerTransport() at startup, before ${url.split("?", 1)[0]}`,
    );
  }
  return transport<T>(url, options);
};

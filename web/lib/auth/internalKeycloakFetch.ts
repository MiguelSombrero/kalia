// Covers the headers and the body together, for every call this fetch makes
// (the token exchange, discovery, the key set). An AbortSignal rather than the
// transport's raced timer: these are not Next.js's memoized GETs, and aborting
// frees the socket.
export const KEYCLOAK_DEADLINE_MS = 10_000;

// Redirects a request targeting Keycloak's public origin to its internal one
// (see auth.ts for why). URL parsing happens lazily, inside the returned
// function: this factory runs at module load, before docker-compose's env
// vars exist during `docker build`'s page-data-collection step, and `new
// URL(undefined)` throws immediately.
export const createInternalKeycloakFetch = (
  publicIssuer: string,
  internalOrigin: string,
): typeof fetch => {
  return (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.origin === new URL(publicIssuer).origin) {
      const internal = new URL(internalOrigin);
      url.protocol = internal.protocol;
      url.host = internal.host;
    }
    return fetch(url, { ...init, signal: withDeadline(init?.signal, input instanceof Request ? input.signal : undefined) });
  };
};

// A timer rather than `AbortSignal.timeout`, so a fake clock drives it. It is
// not cleared when the response ends, as nothing here sees the body finish;
// aborting a finished request is a no-op, and `unref` keeps it from holding
// the process open.
const withDeadline = (...callers: (AbortSignal | null | undefined)[]): AbortSignal => {
  const deadline = new AbortController();
  const timer = setTimeout(
    () => deadline.abort(new DOMException("Keycloak did not answer in time", "TimeoutError")),
    KEYCLOAK_DEADLINE_MS,
  );
  timer.unref?.();
  return AbortSignal.any([deadline.signal, ...callers.filter((signal) => signal != null)]);
};

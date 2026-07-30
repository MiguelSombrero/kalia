/**
 * Redirects any request targeting Keycloak's public origin to its internal
 * Docker Compose origin instead, leaving the rest of the URL (and the
 * calling code's expectations about what "issuer" it's talking to) intact.
 * See auth.ts for why this exists — the public origin is what Auth.js must
 * validate identity against, but the only one the frontend container can
 * actually dial is the internal one.
 *
 * All URL parsing happens lazily, inside the returned function, not here —
 * this factory runs at module load time (auth.ts calls it at the top
 * level), before docker-compose's runtime environment variables exist
 * during `docker build`'s page-data-collection step, and `new URL(undefined)`
 * throws immediately rather than only when a request is actually made.
 */
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
    return fetch(url, init);
  };
};

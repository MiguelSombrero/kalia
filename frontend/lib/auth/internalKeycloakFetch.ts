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
    return fetch(url, init);
  };
};

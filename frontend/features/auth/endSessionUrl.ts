type Params = {
  /** Keycloak's public realm URL — see auth.ts on why this is the public one. */
  issuer: string | undefined;
  /** The stored `id_token` for the session being ended, if there is one. */
  idToken: string | undefined;
  postLogoutRedirectUri: string;
};

/**
 * Keycloak's RP-initiated logout URL, or `null` when there is nothing to end
 * at Keycloak (no session token, or no issuer configured) and the caller
 * should just go home.
 *
 * The path is Keycloak's stable convention (server_admin docs, "OIDC clients"
 * / "Logout") rather than a lookup in the discovery document, which would add
 * a round trip to every sign-out.
 */
export const keycloakEndSessionUrl = ({
  issuer,
  idToken,
  postLogoutRedirectUri,
}: Params): string | null => {
  if (!issuer || !idToken) {
    return null;
  }
  const url = new URL(`${issuer}/protocol/openid-connect/logout`);
  url.searchParams.set("id_token_hint", idToken);
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
  return url.toString();
};

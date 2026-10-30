type Params = {
  /** Keycloak's public realm URL — see auth.ts on why this is the public one. */
  issuer: string | undefined;
  idToken: string | undefined;
  postLogoutRedirectUri: string;
};

// Returns `null` when there is nothing to end at Keycloak, and the caller
// should just go home. Uses Keycloak's stable URL convention rather than the
// discovery document, which would add a round trip to every sign-out.
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

import { decodeJwt } from "jose";

/**
 * The Keycloak SSO session id (`sid`) carried in a signed-in session's
 * id_token, used to index the local session for Back-Channel Logout
 * (ADR-0031). Decoded without verifying the signature: the id_token here is
 * the one oauth4webapi already validated during the token exchange
 * (ADR-0025), not attacker-controlled input.
 */
export const sidFromIdToken = (idToken: string): string | undefined => {
  const { sid } = decodeJwt(idToken);
  return typeof sid === "string" ? sid : undefined;
};

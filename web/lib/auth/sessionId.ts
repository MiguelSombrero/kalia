import { decodeJwt } from "jose";

// Decoded without verifying the signature: this id_token was already
// validated by oauth4webapi during the token exchange (ADR-0025, ADR-0031).
export const sidFromIdToken = (idToken: string): string | undefined => {
  const { sid } = decodeJwt(idToken);
  return typeof sid === "string" ? sid : undefined;
};

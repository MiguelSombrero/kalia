"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { currentSessionToken } from "@/lib/auth/sessionCookie";
import { getSessionAccount } from "@/lib/auth/valkeyAdapter";
import { keycloakEndSessionUrl } from "./endSessionUrl";

export const startSignIn = async () => {
  await signIn("keycloak");
};

// Also ends the Keycloak SSO session via end_session_endpoint, this browser's
// only (id_token_hint names this Auth.js session, ADR-0030). Do not turn this
// into a plain form POST — frontend/README.md's "Never navigate to another
// origin with a real `<form>`" trap; curl won't reproduce the failure.
export const federatedSignOut = async () => {
  const sessionToken = await currentSessionToken();
  const idToken = sessionToken ? (await getSessionAccount(sessionToken))?.id_token : undefined;

  await signOut({ redirect: false });

  // AUTH_URL, not the request: inside the container the request's own URL
  // reflects the 0.0.0.0 bind address rather than the browser-facing host.
  const home = new URL("/", process.env.AUTH_URL).toString();
  const endSession = keycloakEndSessionUrl({
    issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    idToken,
    postLogoutRedirectUri: home,
  });

  // Outside any try/catch: redirect() signals by throwing (Next.js docs,
  // 01-app/03-api-reference/04-functions/redirect.md).
  redirect(endSession ?? home);
};

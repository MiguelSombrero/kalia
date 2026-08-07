import { NextResponse, type NextRequest } from "next/server";
import { validateLogoutToken } from "@/lib/auth/backchannelLogoutToken";
import { endLocalSession } from "@/lib/auth/endLocalSession";
import { getSessionTokenBySid } from "@/lib/auth/valkeyAdapter";

/**
 * Unauthenticated by design: Keycloak calls this directly (server to
 * server, no browser and no session cookie involved), and the Logout
 * Token's own signature is the authentication (ADR-0031). The realm's
 * `kalia-frontend` client attributes (`backchannel.logout.url`,
 * `backchannel.logout.session.required`) are what point Keycloak here.
 */
const invalidRequest = () =>
  NextResponse.json(
    { error: "invalid_request" },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );

/**
 * OpenID Connect Back-Channel Logout 1.0 §2.5/§2.7: a form-encoded
 * `logout_token`, answered with 200 once the notification is accepted —
 * whether or not a matching local session still exists, since that's not
 * information this endpoint is meant to leak — or 400 if the token itself
 * doesn't validate.
 */
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const form = await request.formData().catch(() => undefined);
  const logoutToken = form?.get("logout_token");
  if (typeof logoutToken !== "string") {
    return invalidRequest();
  }

  const result = await validateLogoutToken(logoutToken);
  if (result.status !== "valid") {
    return invalidRequest();
  }

  const sessionToken = await getSessionTokenBySid(result.sid);
  if (sessionToken) {
    await endLocalSession(sessionToken);
  }

  return new NextResponse(null, { status: 200, headers: { "Cache-Control": "no-store" } });
};

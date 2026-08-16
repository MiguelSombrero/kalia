import { NextResponse, type NextRequest } from "next/server";
import { validateLogoutToken } from "@/lib/auth/backchannelLogoutToken";
import { endLocalSession } from "@/lib/auth/endLocalSession";
import { getSessionTokenBySid } from "@/lib/auth/valkeyAdapter";

// Unauthenticated by design: Keycloak calls this server-to-server, no
// browser or session cookie involved — the Logout Token's own signature is
// the authentication (ADR-0031).
const invalidRequest = () =>
  NextResponse.json(
    { error: "invalid_request" },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );

// OpenID Connect Back-Channel Logout 1.0 §2.5/§2.7: answers 200 once the
// notification is accepted, whether or not a matching local session exists
// — that's not information this endpoint is meant to leak.
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

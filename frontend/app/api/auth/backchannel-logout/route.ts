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

const tooLarge = () =>
  NextResponse.json(
    { error: "invalid_request" },
    { status: 413, headers: { "Cache-Control": "no-store" } },
  );

// A Logout Token is a signed JWT of a few kilobytes; the edge proxy applies
// the same cap to this route (edge/nginx.conf, ADR-0090).
const MAX_BODY_BYTES = 16 * 1024;

// Reads at most MAX_BODY_BYTES: Content-Length is only the caller's claim, and
// a chunked body states none, so the count is of what actually arrives.
const readBounded = async (request: NextRequest): Promise<Uint8Array | undefined> => {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return undefined;
  }
  if (!request.body) {
    return new Uint8Array();
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    // A dropped connection ends the body early; what arrived is judged as it is.
    const chunk = await reader.read().catch(() => undefined);
    if (!chunk || chunk.done) break;
    const { value } = chunk;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
};

// OpenID Connect Back-Channel Logout 1.0 §2.5/§2.7: answers 200 once the
// notification is accepted, whether or not a matching local session exists
// — that's not information this endpoint is meant to leak.
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = await readBounded(request);
  if (!body) {
    return tooLarge();
  }

  const form = await new Response(body as BodyInit, {
    headers: { "Content-Type": request.headers.get("content-type") ?? "" },
  })
    .formData()
    .catch(() => undefined);
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

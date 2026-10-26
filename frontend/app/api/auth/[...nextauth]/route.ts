import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { endCurrentSession } from "@/lib/auth/endingLocalSession";
import { withSignInContext } from "@/lib/auth/signInContext";

const SIGN_IN_CALLBACK = /\/callback\/[^/]+$/;

// Do not export `handlers` directly. The sign-in context is what lets
// `events.signIn` file the issued tokens under the session Auth.js just
// created, and its absence fails silently (lib/auth/signInContext.ts).
//
// A sign-in that did not start from the `signIn` in auth.ts, such as Auth.js's
// own /api/auth/signin page, still finishes at the callback; ending the local
// session there is what keeps it from being linked to the next account.
export const GET = (request: NextRequest) =>
  withSignInContext(async () => {
    if (SIGN_IN_CALLBACK.test(request.nextUrl.pathname)) {
      await endCurrentSession();
    }
    return handlers.GET(request);
  });
export const POST = (request: NextRequest) => withSignInContext(() => handlers.POST(request));

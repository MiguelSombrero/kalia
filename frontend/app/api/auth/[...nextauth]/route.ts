import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { withSignInContext } from "@/lib/auth/signInContext";

// Do not export `handlers` directly. The sign-in context is what lets
// `events.signIn` file the issued tokens under the session Auth.js just
// created, and its absence fails silently (lib/auth/signInContext.ts).
export const GET = (request: NextRequest) => withSignInContext(() => handlers.GET(request));
export const POST = (request: NextRequest) => withSignInContext(() => handlers.POST(request));

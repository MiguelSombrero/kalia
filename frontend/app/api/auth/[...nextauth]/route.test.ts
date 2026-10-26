import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const handlerGet = vi.fn(async (request: NextRequest) => {
  calls.push(`handler:${request.nextUrl.pathname}`);
  return new Response(null, { status: 200 });
});
const endCurrentSession = vi.fn(async () => {
  calls.push("end");
});

vi.mock("@/auth", () => ({ handlers: { GET: handlerGet, POST: vi.fn() } }));
vi.mock("@/lib/auth/endingLocalSession", () => ({ endCurrentSession }));

describe("the Auth.js route", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
  });

  it("ends the local session before the sign-in callback links an account to it", async () => {
    const { GET } = await import("./route");

    await GET(new NextRequest("http://localhost:3000/api/auth/callback/keycloak?code=c&state=s"));

    expect(calls).toEqual(["end", "handler:/api/auth/callback/keycloak"]);
  });

  it("leaves the session alone for every other Auth.js request", async () => {
    const { GET } = await import("./route");

    await GET(new NextRequest("http://localhost:3000/api/auth/session"));

    expect(endCurrentSession).not.toHaveBeenCalled();
  });
});

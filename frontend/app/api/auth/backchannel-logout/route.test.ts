import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateLogoutToken } from "@/lib/auth/backchannelLogoutToken";
import { endLocalSession } from "@/lib/auth/endLocalSession";
import { getSessionTokenBySid } from "@/lib/auth/valkeyAdapter";
import { POST } from "./route";

vi.mock("@/lib/auth/backchannelLogoutToken", () => ({ validateLogoutToken: vi.fn() }));
vi.mock("@/lib/auth/valkeyAdapter", () => ({ getSessionTokenBySid: vi.fn() }));
vi.mock("@/lib/auth/endLocalSession", () => ({ endLocalSession: vi.fn() }));

const postWithLogoutToken = (logoutToken: string | undefined) => {
  const body = new URLSearchParams();
  if (logoutToken !== undefined) {
    body.set("logout_token", logoutToken);
  }
  return new NextRequest("http://frontend:3000/api/auth/backchannel-logout", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/backchannel-logout", () => {
  it("ends the local session and answers 200 for a valid token naming a live session", async () => {
    vi.mocked(validateLogoutToken).mockResolvedValue({ status: "valid", sid: "sso-session-1" });
    vi.mocked(getSessionTokenBySid).mockResolvedValue("tok-1");

    const response = await POST(postWithLogoutToken("a-valid-token"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(endLocalSession).toHaveBeenCalledWith("tok-1");
  });

  // Not an error: the spec has the RP treat "no such session" as successfully
  // processed, since whether one existed is not information to leak back.
  it("answers 200 without ending anything when no session matches the sid", async () => {
    vi.mocked(validateLogoutToken).mockResolvedValue({ status: "valid", sid: "sso-session-1" });
    vi.mocked(getSessionTokenBySid).mockResolvedValue(null);

    const response = await POST(postWithLogoutToken("a-valid-token"));

    expect(response.status).toBe(200);
    expect(endLocalSession).not.toHaveBeenCalled();
  });

  it("answers 400 for a token that fails validation", async () => {
    vi.mocked(validateLogoutToken).mockResolvedValue({ status: "invalid" });

    const response = await POST(postWithLogoutToken("a-bad-token"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
    expect(endLocalSession).not.toHaveBeenCalled();
  });

  it("answers 400 when the request carries no logout_token", async () => {
    const response = await POST(postWithLogoutToken(undefined));

    expect(response.status).toBe(400);
    expect(validateLogoutToken).not.toHaveBeenCalled();
  });

  it("answers 400 for a request that is not form-encoded", async () => {
    const request = new NextRequest("http://frontend:3000/api/auth/backchannel-logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logout_token: "a-valid-token" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(validateLogoutToken).not.toHaveBeenCalled();
  });
});

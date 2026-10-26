import { beforeEach, describe, expect, it, vi } from "vitest";
import { endLocalSession } from "./endLocalSession";
import { endingLocalSession } from "./endingLocalSession";
import { currentSessionToken } from "./sessionCookie";

vi.mock("./endLocalSession", () => ({ endLocalSession: vi.fn() }));
vi.mock("./sessionCookie", () => ({ currentSessionToken: vi.fn() }));

describe("endingLocalSession", () => {
  const calls: string[] = [];
  const signIn = vi.fn(async (provider: string, options: { redirectTo: string }) => {
    calls.push(`signIn:${provider}:${options.redirectTo}`);
    return "redirected";
  });

  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    vi.mocked(endLocalSession).mockImplementation(async (token) => {
      calls.push(`end:${token}`);
    });
  });

  it("ends the signed-in session before the sign-in starts, and passes the sign-in through", async () => {
    vi.mocked(currentSessionToken).mockResolvedValue("session-of-a");

    const result = await endingLocalSession(signIn)("keycloak", { redirectTo: "/en" });

    expect(calls).toEqual(["end:session-of-a", "signIn:keycloak:/en"]);
    expect(result).toBe("redirected");
  });

  it("starts the sign-in without ending anything when nobody is signed in", async () => {
    vi.mocked(currentSessionToken).mockResolvedValue(undefined);

    await endingLocalSession(signIn)("keycloak", { redirectTo: "/en" });

    expect(endLocalSession).not.toHaveBeenCalled();
    expect(calls).toEqual(["signIn:keycloak:/en"]);
  });

  it("does not start the sign-in when the old session could not be ended", async () => {
    vi.mocked(currentSessionToken).mockResolvedValue("session-of-a");
    vi.mocked(endLocalSession).mockRejectedValue(new Error("valkey down"));

    await expect(endingLocalSession(signIn)("keycloak", { redirectTo: "/en" })).rejects.toThrow("valkey down");

    expect(signIn).not.toHaveBeenCalled();
  });
});

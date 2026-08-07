import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { endLocalSession } from "./endLocalSession";
import { valkeyAdapter } from "./valkeyAdapter";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("./valkeyAdapter", () => ({ valkeyAdapter: { deleteSession: vi.fn() } }));

const withCookies = (jar: Record<string, string>) => {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name in jar ? { name, value: jar[name] } : undefined),
  } as never);
};

describe("endLocalSession", () => {
  beforeEach(() => {
    vi.mocked(valkeyAdapter.deleteSession!).mockClear();
  });

  it("deletes the session record the caller's cookie points at", async () => {
    withCookies({ "authjs.session-token": "session-abc" });

    await endLocalSession();

    expect(valkeyAdapter.deleteSession).toHaveBeenCalledWith("session-abc");
  });

  it("finds the session over https, where Auth.js prefixes the cookie", async () => {
    withCookies({ "__Secure-authjs.session-token": "session-abc" });

    await endLocalSession();

    expect(valkeyAdapter.deleteSession).toHaveBeenCalledWith("session-abc");
  });

  it("does nothing when the caller carries no session cookie", async () => {
    withCookies({});

    await endLocalSession();

    expect(valkeyAdapter.deleteSession).not.toHaveBeenCalled();
  });
});

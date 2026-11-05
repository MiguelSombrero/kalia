// @vitest-environment node
import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { currentAccessToken } = vi.hoisted(() => ({ currentAccessToken: vi.fn() }));
vi.mock("@/lib/api/accessToken", () => ({ currentAccessToken }));

import { currentUserIsAdmin, hasAdminRole } from "./adminRole";

const tokenWith = async (claims: Record<string, unknown>) =>
  new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("secret"));

describe("hasAdminRole", () => {
  it("is true for a token whose realm roles include admin", async () => {
    const token = await tokenWith({ realm_access: { roles: ["default-roles-kalia", "admin"] } });

    expect(hasAdminRole(token)).toBe(true);
  });

  it("is false for a token with other roles only", async () => {
    const token = await tokenWith({ realm_access: { roles: ["default-roles-kalia"] } });

    expect(hasAdminRole(token)).toBe(false);
  });

  it("is false when the token has no role claim, or a malformed one", async () => {
    expect(hasAdminRole(await tokenWith({ sub: "user-1" }))).toBe(false);
    expect(hasAdminRole(await tokenWith({ realm_access: {} }))).toBe(false);
    expect(hasAdminRole(await tokenWith({ realm_access: { roles: "admin" } }))).toBe(false);
    expect(hasAdminRole(await tokenWith({ realm_access: "admin" }))).toBe(false);
  });

  it("does not take a role from a client's roles or another claim", async () => {
    const token = await tokenWith({
      resource_access: { "kalia-backend": { roles: ["admin"] } },
      roles: ["admin"],
      scope: "admin",
    });

    expect(hasAdminRole(token)).toBe(false);
  });

  it("is false with no token, or one that is not a JWT", () => {
    expect(hasAdminRole(undefined)).toBe(false);
    expect(hasAdminRole("")).toBe(false);
    expect(hasAdminRole("not-a-jwt")).toBe(false);
  });
});

describe("currentUserIsAdmin", () => {
  beforeEach(() => currentAccessToken.mockReset());

  it("reads the role from the session's access token", async () => {
    currentAccessToken.mockResolvedValue(await tokenWith({ realm_access: { roles: ["admin"] } }));

    await expect(currentUserIsAdmin()).resolves.toBe(true);
  });

  it("is false for a signed-out visitor, who has no access token", async () => {
    currentAccessToken.mockResolvedValue(undefined);

    await expect(currentUserIsAdmin()).resolves.toBe(false);
  });
});

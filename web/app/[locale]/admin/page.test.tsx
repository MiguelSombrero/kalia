// @vitest-environment node
import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { currentAccessToken } = vi.hoisted(() => ({ currentAccessToken: vi.fn() }));
vi.mock("@/lib/api/accessToken", () => ({ currentAccessToken }));

import AdminPage, { generateMetadata } from "./page";

const tokenWith = async (claims: Record<string, unknown>) =>
  new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("secret"));

const props = (locale = "en") => ({ params: Promise.resolve({ locale }) });

// What notFound() throws: Next's own 404 marker, which its renderer turns into
// the not-found page and a 404 status.
const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

beforeEach(() => {
  currentAccessToken.mockReset();
});

describe("the admin page", () => {
  it("is answered not-found to a signed-out visitor, before anything of the page", async () => {
    currentAccessToken.mockResolvedValue(undefined);

    await expect(AdminPage(props())).rejects.toMatchObject(NOT_FOUND);
  });

  it("is answered not-found to a signed-in user without the admin role", async () => {
    currentAccessToken.mockResolvedValue(await tokenWith({ realm_access: { roles: ["default-roles-kalia"] } }));

    await expect(AdminPage(props("fi"))).rejects.toMatchObject(NOT_FOUND);
  });

  it("is answered not-found to a session whose token has no role claim", async () => {
    currentAccessToken.mockResolvedValue(await tokenWith({ sub: "user-1" }));

    await expect(AdminPage(props())).rejects.toMatchObject(NOT_FOUND);
  });

  it("renders the placeholder for an admin, in each locale", async () => {
    currentAccessToken.mockResolvedValue(await tokenWith({ realm_access: { roles: ["admin"] } }));

    const en = JSON.stringify(await AdminPage(props("en")));
    const fi = JSON.stringify(await AdminPage(props("fi")));

    expect(en).toContain('"children":"Admin"');
    expect(en).toContain("Coming soon");
    expect(fi).toContain('"children":"Ylläpito"');
    expect(fi).toContain("Tulossa pian");
  });

  it("titles the page only for an admin, and otherwise like a missing page", async () => {
    currentAccessToken.mockResolvedValue(await tokenWith({ realm_access: { roles: ["admin"] } }));
    expect((await generateMetadata(props())).title).toBe("Admin — Kalia");

    currentAccessToken.mockResolvedValue(undefined);
    expect((await generateMetadata(props())).title).toBe("Page not found — Kalia");
  });
});

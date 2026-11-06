// @vitest-environment node
import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { currentAccessToken } = vi.hoisted(() => ({ currentAccessToken: vi.fn() }));
vi.mock("@/lib/api/accessToken", () => ({ currentAccessToken }));

import AdminPage, { generateMetadata } from "./page";

const tokenWith = async (claims: Record<string, unknown>) =>
  new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("secret"));

const props = (locale = "en", page?: string) => ({
  params: Promise.resolve({ locale }),
  searchParams: Promise.resolve({ page }),
});

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

  it("renders the review page for an admin, titled in each locale, with the queue still to load", async () => {
    currentAccessToken.mockResolvedValue(await tokenWith({ realm_access: { roles: ["admin"] } }));

    const en = JSON.stringify(await AdminPage(props("en")));
    const fi = JSON.stringify(await AdminPage(props("fi")));

    expect(en).toContain('"children":"Review suggestions"');
    expect(fi).toContain('"children":"Ehdotusten tarkistus"');
    expect(en).not.toContain("Coming soon");
    expect(fi).not.toContain("Tulossa pian");
  });

  it.each([
    [undefined, 0],
    ["1", 0],
    ["3", 2],
    ["0", 0],
    ["abc", 0],
    ["-2", 0],
  ])("asks for the queue's page %s as the API's page %s", async (raw, expected) => {
    currentAccessToken.mockResolvedValue(await tokenWith({ realm_access: { roles: ["admin"] } }));

    const rendered = JSON.stringify(await AdminPage(props("en", raw)));

    expect(rendered).toContain(`"page":${expected}`);
  });

  it("titles the page only for an admin, and otherwise like a missing page", async () => {
    currentAccessToken.mockResolvedValue(await tokenWith({ realm_access: { roles: ["admin"] } }));
    expect((await generateMetadata(props())).title).toBe("Admin — Kalia");

    currentAccessToken.mockResolvedValue(undefined);
    expect((await generateMetadata(props())).title).toBe("Page not found — Kalia");
  });
});

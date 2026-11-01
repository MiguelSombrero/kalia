// @vitest-environment node
import { Auth, customFetch, type AuthConfig } from "@auth/core";
import type { Adapter, AdapterSession, AdapterUser } from "@auth/core/adapters";
import { beforeEach, describe, expect, it, vi } from "vitest";

// What these tests pin is Auth.js's own order of work, so the callback runs
// inside the real @auth/core: only the identity provider, the session store
// and the cookie jar are stand-ins.
const sessions = new Map<string, AdapterSession>();
const users = new Map<string, AdapterUser>();
const accounts = new Map<string, string>();
let presentedSessionToken: string | undefined;

const adapter: Adapter = {
  createUser: async (user) => {
    const created = { ...user, id: `user-${users.size + 1}` } as AdapterUser;
    users.set(created.id, created);
    return created;
  },
  getUser: async (id) => users.get(id) ?? null,
  getUserByEmail: async () => null,
  updateUser: async (user) => ({ ...users.get(user.id!)!, ...user }) as AdapterUser,
  updateSession: async (session) => sessions.get(session.sessionToken) ?? null,
  getUserByAccount: async ({ providerAccountId }) => {
    const userId = accounts.get(providerAccountId);
    return userId ? (users.get(userId) ?? null) : null;
  },
  linkAccount: async (account) => {
    accounts.set(account.providerAccountId, account.userId);
    return account;
  },
  createSession: async (session) => {
    sessions.set(session.sessionToken, session);
    return session;
  },
  getSessionAndUser: async (sessionToken) => {
    const session = sessions.get(sessionToken);
    const user = session && users.get(session.userId);
    return session && user ? { session, user } : null;
  },
  deleteSession: async (sessionToken) => {
    sessions.delete(sessionToken);
  },
};

vi.mock("./sessionCookie", () => ({ currentSessionToken: async () => presentedSessionToken }));
vi.mock("./valkeyAdapter", () => ({ valkeyAdapter: adapter }));

const idp = "https://idp.test";
const callbackUrl = "http://localhost:3000/api/auth/callback/keycloak";

const identityProvider = async (input: URL | RequestInfo): Promise<Response> => {
  const url = String(input);
  if (url.startsWith(`${idp}/token`)) {
    return Response.json({ access_token: "access", token_type: "bearer" });
  }
  if (url.startsWith(`${idp}/userinfo`)) {
    return Response.json({ sub: "keycloak-sub", name: "ada" });
  }
  throw new Error(`unexpected request to ${url}`);
};

const config = async (): Promise<AuthConfig> => {
  const { endPreviousSession } = await import("./endingLocalSession");
  return {
    adapter,
    basePath: "/api/auth",
    secret: "test-secret-test-secret-test-secret",
    trustHost: true,
    session: { strategy: "database" },
    callbacks: { signIn: endPreviousSession },
    providers: [
      {
        id: "keycloak",
        name: "Keycloak",
        type: "oauth",
        clientId: "kalia",
        clientSecret: "secret",
        checks: ["pkce", "state"],
        authorization: { url: `${idp}/auth`, params: { scope: "openid" } },
        token: `${idp}/token`,
        userinfo: `${idp}/userinfo`,
        profile: (profile: { sub: string; name: string }) => ({ id: profile.sub, name: profile.name }),
        [customFetch]: identityProvider,
      } as never,
    ],
  };
};

const cookieJar = (response: Response): string =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

// Starts a sign-in the way the browser would and returns the cookies and the
// state it left behind.
const startSignIn = async (): Promise<{ cookies: string; state: string }> => {
  const csrf = await Auth(new Request("http://localhost:3000/api/auth/csrf"), await config());
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  const csrfCookies = cookieJar(csrf);
  const started = await Auth(
    new Request("http://localhost:3000/api/auth/signin/keycloak", {
      method: "POST",
      headers: { cookie: csrfCookies, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, callbackUrl: "http://localhost:3000/en" }),
    }),
    await config(),
  );
  const state = new URL(started.headers.get("location")!).searchParams.get("state")!;
  return { cookies: `${csrfCookies}; ${cookieJar(started)}`, state };
};

const callback = async (query: Record<string, string>, cookies: string) => {
  const url = `${callbackUrl}?${new URLSearchParams(query)}`;
  return Auth(new Request(url, { headers: { cookie: cookies } }), await config());
};

describe("ending the previous session at the sign-in callback", () => {
  beforeEach(() => {
    sessions.clear();
    users.clear();
    accounts.clear();
    users.set("user-0", { id: "user-0", name: "grace", email: "", emailVerified: null } as AdapterUser);
    sessions.set("previous", { sessionToken: "previous", userId: "user-0", expires: new Date(Date.now() + 3_600_000) });
    presentedSessionToken = "previous";
  });

  it("keeps the session when the callback carries no state this browser issued", async () => {
    await callback({ code: "c", state: "forged" }, "authjs.session-token=previous");

    expect(sessions.has("previous")).toBe(true);
    expect(accounts.size).toBe(0);
  });

  it("keeps the session when the callback's state is not the one this browser holds", async () => {
    const { cookies } = await startSignIn();

    await callback({ code: "c", state: "someone-elses" }, `${cookies}; authjs.session-token=previous`);

    expect(sessions.has("previous")).toBe(true);
    expect(accounts.size).toBe(0);
  });

  it("ends the session of a sign-in this browser started, and does not file the new account under it", async () => {
    const { cookies, state } = await startSignIn();

    const response = await callback({ code: "c", state }, `${cookies}; authjs.session-token=previous`);

    expect(response.status).toBe(302);
    expect(sessions.has("previous")).toBe(false);
    expect(accounts.get("keycloak-sub")).not.toBe("user-0");
    const [issued] = [...sessions.values()];
    expect(issued.userId).toBe(accounts.get("keycloak-sub"));
  });
});

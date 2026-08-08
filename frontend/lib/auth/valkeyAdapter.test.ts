import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdapterUser } from "next-auth/adapters";

const { store, valkeyClient } = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    store,
    valkeyClient: {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      // No real expiry, only key presence — so PXAT/KEEPTTL are ignored. XX is
      // not: refusing to create a missing key is a guarantee the adapter leans
      // on, so the fake honours it rather than letting a test pass on shape.
      set: vi.fn(async (key: string, value: string, ...options: unknown[]) => {
        if (options.includes("XX") && !store.has(key)) {
          return null;
        }
        store.set(key, value);
        return "OK";
      }),
      del: vi.fn(async (...keys: string[]) => keys.filter((key) => store.delete(key)).length),
    },
  };
});
vi.mock("./valkeyClient", () => ({ valkeyClient }));

import {
  getSessionAccount,
  getSessionTokenBySid,
  putSessionAccount,
  putSessionSid,
  updateSessionAccount,
  valkeyAdapter,
} from "./valkeyAdapter";

// createUser's real callers (Auth.js) never pass an id — the adapter always
// generates its own and ignores whatever's here, so the value is a marker.
const newUserInput = (overrides: Partial<AdapterUser> = {}): AdapterUser => ({
  id: "ignored-input-id",
  name: "Ada Lovelace",
  email: "ada@example.com",
  emailVerified: null,
  ...overrides,
});

const account = {
  type: "oidc" as const,
  provider: "keycloak",
  providerAccountId: "keycloak-sub-123",
  access_token: "access-token",
  refresh_token: "refresh-token",
  id_token: "id-token",
};

beforeEach(() => store.clear());

describe("valkeyAdapter", () => {
  it("creates a user with a generated id, and getUser round-trips it", async () => {
    const created = await valkeyAdapter.createUser!(newUserInput());

    expect(created.id).toBeTruthy();
    expect(created.id).not.toBe("ignored-input-id");
    await expect(valkeyAdapter.getUser!(created.id)).resolves.toEqual(created);
  });

  it("round-trips emailVerified as a real Date, not a string", async () => {
    const verifiedAt = new Date("2026-01-01T00:00:00.000Z");
    const created = await valkeyAdapter.createUser!(newUserInput({ emailVerified: verifiedAt }));

    const fetched = await valkeyAdapter.getUser!(created.id);
    expect(fetched?.emailVerified).toBeInstanceOf(Date);
    expect(fetched?.emailVerified?.toISOString()).toBe(verifiedAt.toISOString());
  });

  it("returns null for an unknown user id", async () => {
    await expect(valkeyAdapter.getUser!("does-not-exist")).resolves.toBeNull();
  });

  it("links an account and finds the user by provider + providerAccountId", async () => {
    const user = await valkeyAdapter.createUser!(newUserInput());
    await valkeyAdapter.linkAccount!({ ...account, userId: user.id });

    await expect(
      valkeyAdapter.getUserByAccount!({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      }),
    ).resolves.toEqual(user);
  });

  // Load-bearing: linkAccount runs once per account ever, so any token it
  // wrote would outlive every session that follows (ADR-0030).
  it("linkAccount stores no tokens, only the lookup index", async () => {
    const user = await valkeyAdapter.createUser!(newUserInput());
    await valkeyAdapter.linkAccount!({ ...account, userId: user.id });

    expect([...store.values()].join("|")).not.toContain("id-token");
  });

  it("creates and reads back a session, joined with its user", async () => {
    const user = await valkeyAdapter.createUser!(newUserInput());
    const expires = new Date(Date.now() + 60_000);
    await valkeyAdapter.createSession!({ sessionToken: "tok-1", userId: user.id, expires });

    await expect(valkeyAdapter.getSessionAndUser!("tok-1")).resolves.toEqual({
      session: { sessionToken: "tok-1", userId: user.id, expires },
      user,
    });
  });

  it("returns null for a session token that was never created", async () => {
    await expect(valkeyAdapter.getSessionAndUser!("missing")).resolves.toBeNull();
  });

  it("updateSession extends the stored expiry", async () => {
    const user = await valkeyAdapter.createUser!(newUserInput());
    await valkeyAdapter.createSession!({
      sessionToken: "tok-2",
      userId: user.id,
      expires: new Date(Date.now() + 1_000),
    });

    const newExpires = new Date(Date.now() + 999_000);
    await valkeyAdapter.updateSession!({ sessionToken: "tok-2", expires: newExpires });

    const result = await valkeyAdapter.getSessionAndUser!("tok-2");
    expect(result?.session.expires).toEqual(newExpires);
  });

  it("deleteSession removes the session and returns what was deleted", async () => {
    const user = await valkeyAdapter.createUser!(newUserInput());
    const expires = new Date(Date.now() + 60_000);
    await valkeyAdapter.createSession!({ sessionToken: "tok-3", userId: user.id, expires });

    const deleted = await valkeyAdapter.deleteSession!("tok-3");

    expect(deleted).toEqual({ sessionToken: "tok-3", userId: user.id, expires });
    await expect(valkeyAdapter.getSessionAndUser!("tok-3")).resolves.toBeNull();
  });
});

describe("the session's Keycloak token set", () => {
  const expires = () => new Date(Date.now() + 60_000);

  it("round-trips under the session it was issued for, expiring with it", async () => {
    const expiry = expires();
    await putSessionAccount("tok-1", { ...account, userId: "user-1" }, expiry);

    await expect(getSessionAccount("tok-1")).resolves.toMatchObject({ id_token: "id-token" });
    expect(valkeyClient.set).toHaveBeenCalledWith(
      "auth:session-account:tok-1",
      expect.any(String),
      "PXAT",
      expiry.getTime(),
    );
  });

  it("is null for a session that has none", async () => {
    await expect(getSessionAccount("never-signed-in")).resolves.toBeNull();
  });

  // Load-bearing: one user signed in twice is the case the whole keying exists
  // for, and sign-out reads this record for the id_token_hint it sends, so a
  // shared record ends the wrong Keycloak session (ADR-0030).
  it("keeps two devices' tokens apart for the same user", async () => {
    const laptop = { ...account, userId: "user-1", id_token: "laptop-id-token" };
    const phone = { ...account, userId: "user-1", id_token: "phone-id-token" };

    await putSessionAccount("tok-laptop", laptop, expires());
    await putSessionAccount("tok-phone", phone, expires());

    await expect(getSessionAccount("tok-laptop")).resolves.toMatchObject({
      id_token: "laptop-id-token",
    });
    await expect(getSessionAccount("tok-phone")).resolves.toMatchObject({
      id_token: "phone-id-token",
    });
  });

  it("dies with its session, leaving the other device signed in", async () => {
    const user = await valkeyAdapter.createUser!(newUserInput());
    await valkeyAdapter.createSession!({
      sessionToken: "tok-laptop",
      userId: user.id,
      expires: expires(),
    });
    await putSessionAccount("tok-laptop", { ...account, userId: user.id }, expires());
    await putSessionAccount("tok-phone", { ...account, userId: user.id }, expires());

    await valkeyAdapter.deleteSession!("tok-laptop");

    await expect(getSessionAccount("tok-laptop")).resolves.toBeNull();
    await expect(getSessionAccount("tok-phone")).resolves.not.toBeNull();
  });

  // Load-bearing: a renewed access token must not push the record's expiry
  // past the session it belongs to, which is what a plain SET would do.
  it("keeps the record's expiry when a renewed set is written back", async () => {
    const expiry = expires();
    await putSessionAccount("tok-1", { ...account, userId: "user-1" }, expiry);
    valkeyClient.set.mockClear();

    await updateSessionAccount("tok-1", {
      ...account,
      userId: "user-1",
      access_token: "renewed",
    });

    expect(valkeyClient.set).toHaveBeenCalledWith(
      "auth:session-account:tok-1",
      expect.any(String),
      "KEEPTTL",
      "XX",
    );
    await expect(getSessionAccount("tok-1")).resolves.toMatchObject({ access_token: "renewed" });
  });

  // Load-bearing: a renewal is a round trip to Keycloak, so the session can
  // end while it is in flight. Recreating the record here would leave a live
  // refresh token under a key with no expiry, for a session nobody can reach.
  it("does not resurrect the record when the session ended mid-renewal", async () => {
    await putSessionAccount("tok-1", { ...account, userId: "user-1" }, expires());
    await valkeyAdapter.deleteSession!("tok-1");

    await updateSessionAccount("tok-1", { ...account, userId: "user-1", access_token: "renewed" });

    await expect(getSessionAccount("tok-1")).resolves.toBeNull();
  });
});

describe("the session's sid index", () => {
  const expires = () => new Date(Date.now() + 60_000);

  it("finds the session token belonging to a Keycloak SSO session id", async () => {
    await putSessionSid("tok-1", "sso-session-1", expires());

    await expect(getSessionTokenBySid("sso-session-1")).resolves.toBe("tok-1");
  });

  it("is null for an sid nothing was ever filed under", async () => {
    await expect(getSessionTokenBySid("never-seen")).resolves.toBeNull();
  });

  // Load-bearing: a Back-Channel Logout token naming this sid after the
  // session ended must find nothing, or it would look like the notification
  // was ignored (ADR-0031).
  it("deleteSession removes the sid index along with the session", async () => {
    const user = await valkeyAdapter.createUser!(newUserInput());
    await valkeyAdapter.createSession!({ sessionToken: "tok-1", userId: user.id, expires: expires() });
    await putSessionSid("tok-1", "sso-session-1", expires());

    await valkeyAdapter.deleteSession!("tok-1");

    await expect(getSessionTokenBySid("sso-session-1")).resolves.toBeNull();
  });

  it("deleteSession does not fail for a session with no sid on record", async () => {
    const user = await valkeyAdapter.createUser!(newUserInput());
    await valkeyAdapter.createSession!({ sessionToken: "tok-1", userId: user.id, expires: expires() });

    await expect(valkeyAdapter.deleteSession!("tok-1")).resolves.toMatchObject({
      sessionToken: "tok-1",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdapterUser } from "next-auth/adapters";

const { store, valkeyClient } = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    store,
    valkeyClient: {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      // Extra args (PXAT + timestamp) are accepted by callers but ignored
      // here — this fake has no real expiry, only key presence.
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
        return "OK";
      }),
      del: vi.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
    },
  };
});
vi.mock("./valkeyClient", () => ({ valkeyClient }));

import { getStoredAccountByUserId, valkeyAdapter } from "./valkeyAdapter";

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

  it("getStoredAccountByUserId returns the linked account's tokens", async () => {
    const user = await valkeyAdapter.createUser!(newUserInput());
    await valkeyAdapter.linkAccount!({ ...account, userId: user.id });

    await expect(getStoredAccountByUserId(user.id)).resolves.toMatchObject({
      id_token: "id-token",
    });
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

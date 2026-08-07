import type { Adapter, AdapterAccount, AdapterSession, AdapterUser } from "next-auth/adapters";
import { valkeyClient } from "./valkeyClient";

const userKey = (userId: string) => `auth:user:${userId}`;
const accountKey = (userId: string) => `auth:account:${userId}`;
const accountIndexKey = (provider: string, providerAccountId: string) =>
  `auth:account-index:${provider}:${providerAccountId}`;
const sessionKey = (sessionToken: string) => `auth:session:${sessionToken}`;
const emailIndexKey = (email: string) => `auth:user-by-email:${email}`;

// Valkey/JSON has no Date type — every stored record keeps date fields as
// ISO strings and converts back to Date on the way out.
type StoredUser = Omit<AdapterUser, "emailVerified"> & { emailVerified: string | null };
type StoredSession = Omit<AdapterSession, "expires"> & { expires: string };

const toStoredUser = (user: AdapterUser): StoredUser => ({
  ...user,
  emailVerified: user.emailVerified ? user.emailVerified.toISOString() : null,
});

const fromStoredUser = (stored: StoredUser): AdapterUser => ({
  ...stored,
  emailVerified: stored.emailVerified ? new Date(stored.emailVerified) : null,
});

const toStoredSession = (session: AdapterSession): StoredSession => ({
  ...session,
  expires: session.expires.toISOString(),
});

const fromStoredSession = (stored: StoredSession): AdapterSession => ({
  ...stored,
  expires: new Date(stored.expires),
});

const readUser = async (userId: string): Promise<AdapterUser | null> => {
  const raw = await valkeyClient.get(userKey(userId));
  return raw ? fromStoredUser(JSON.parse(raw) as StoredUser) : null;
};

/**
 * Outside the standard Adapter interface: federated (Keycloak) sign-out
 * needs the stored id_token before the session/account are deleted, keyed
 * by user id rather than by provider (app/api/auth/federated-signout).
 */
export const getStoredAccountByUserId = async (userId: string): Promise<AdapterAccount | null> => {
  const raw = await valkeyClient.get(accountKey(userId));
  return raw ? (JSON.parse(raw) as AdapterAccount) : null;
};

/**
 * Outside the standard Adapter interface, and the same upsert `linkAccount`
 * performs. The Adapter has no `updateAccount`, so writing a token set back —
 * on re-sign-in (auth.ts's `events.signIn`) or after a silent refresh
 * (lib/api/accessToken.ts) — goes through this.
 */
export const putStoredAccount = async (account: AdapterAccount): Promise<void> => {
  await valkeyClient.set(accountKey(account.userId), JSON.stringify(account));
  await valkeyClient.set(
    accountIndexKey(account.provider, account.providerAccountId),
    account.userId,
  );
};

/**
 * Auth.js database-session adapter backed by Valkey (docs/adr/0003-bff-pattern.md).
 * getUserByEmail is implemented even though this is an OAuth-only setup with
 * no Email provider: Auth.js's own runtime assertion (@auth/core's
 * lib/utils/assert.js sessionMethods) requires it unconditionally for the
 * "database" session strategy, regardless of provider type — confirmed by
 * running the sign-in flow, since the adapter type docs' method-by-method
 * "currently invoked" notes don't mention this. createVerificationToken/
 * useVerificationToken (email sign-in), deleteUser/unlinkAccount (marked
 * "not currently invoked" in that same file) and the WebAuthn authenticator
 * methods are genuinely unused and stay omitted.
 */
export const valkeyAdapter: Adapter = {
  createUser: async (user) => {
    const created: AdapterUser = { ...user, id: crypto.randomUUID() };
    await valkeyClient.set(userKey(created.id), JSON.stringify(toStoredUser(created)));
    await valkeyClient.set(emailIndexKey(created.email), created.id);
    return created;
  },

  getUser: (id) => readUser(id),

  getUserByEmail: async (email) => {
    const userId = await valkeyClient.get(emailIndexKey(email));
    return userId ? readUser(userId) : null;
  },

  getUserByAccount: async ({ provider, providerAccountId }) => {
    const userId = await valkeyClient.get(accountIndexKey(provider, providerAccountId));
    return userId ? readUser(userId) : null;
  },

  updateUser: async (partialUser) => {
    const existing = await readUser(partialUser.id);
    if (!existing) {
      throw new Error(`Cannot update unknown user ${partialUser.id}`);
    }
    const updated = { ...existing, ...partialUser };
    await valkeyClient.set(userKey(updated.id), JSON.stringify(toStoredUser(updated)));
    if (updated.email !== existing.email) {
      await valkeyClient.del(emailIndexKey(existing.email));
      await valkeyClient.set(emailIndexKey(updated.email), updated.id);
    }
    return updated;
  },

  linkAccount: putStoredAccount,

  getAccount: async (providerAccountId, provider) => {
    const userId = await valkeyClient.get(accountIndexKey(provider, providerAccountId));
    if (!userId) {
      return null;
    }
    const raw = await valkeyClient.get(accountKey(userId));
    return raw ? (JSON.parse(raw) as AdapterAccount) : null;
  },

  createSession: async (session) => {
    const stored = toStoredSession({ ...session });
    await valkeyClient.set(
      sessionKey(session.sessionToken),
      JSON.stringify(stored),
      "PXAT",
      session.expires.getTime(),
    );
    return session;
  },

  getSessionAndUser: async (sessionToken) => {
    const raw = await valkeyClient.get(sessionKey(sessionToken));
    if (!raw) {
      return null;
    }
    const session = fromStoredSession(JSON.parse(raw) as StoredSession);
    const user = await readUser(session.userId);
    return user ? { session, user } : null;
  },

  updateSession: async (partialSession) => {
    const raw = await valkeyClient.get(sessionKey(partialSession.sessionToken));
    if (!raw) {
      return null;
    }
    const updated = { ...fromStoredSession(JSON.parse(raw) as StoredSession), ...partialSession };
    await valkeyClient.set(
      sessionKey(updated.sessionToken),
      JSON.stringify(toStoredSession(updated)),
      "PXAT",
      updated.expires.getTime(),
    );
    return updated;
  },

  deleteSession: async (sessionToken) => {
    const raw = await valkeyClient.get(sessionKey(sessionToken));
    await valkeyClient.del(sessionKey(sessionToken));
    return raw ? fromStoredSession(JSON.parse(raw) as StoredSession) : undefined;
  },
};

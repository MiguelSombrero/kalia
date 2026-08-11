import type { Adapter, AdapterAccount, AdapterSession, AdapterUser } from "next-auth/adapters";
import { rememberCreatedSession } from "./signInContext";
import { valkeyClient } from "./valkeyClient";

/**
 * The subset of ioredis's `Redis` this adapter calls, narrowed to exactly
 * the `set` call shapes used below — so a test double needs no more than
 * this to stand in for it (ADR-0037).
 */
export type ValkeyClient = {
  get: (key: string) => Promise<string | null>;
  set(key: string, value: string): Promise<string | null>;
  set(key: string, value: string, mode: "PXAT", millisecondsTimestamp: number): Promise<string | null>;
  set(key: string, value: string, mode: "KEEPTTL", flag: "XX"): Promise<string | null>;
  del: (...keys: string[]) => Promise<number>;
};

const userKey = (userId: string) => `auth:user:${userId}`;
const accountIndexKey = (provider: string, providerAccountId: string) =>
  `auth:account-index:${provider}:${providerAccountId}`;
const sessionKey = (sessionToken: string) => `auth:session:${sessionToken}`;
const sessionAccountKey = (sessionToken: string) => `auth:session-account:${sessionToken}`;
const emailIndexKey = (email: string) => `auth:user-by-email:${email}`;
const sidIndexKey = (sid: string) => `auth:sid-index:${sid}`;
const sessionSidKey = (sessionToken: string) => `auth:session-sid:${sessionToken}`;

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

/**
 * Builds the Valkey-backed Auth.js adapter plus the session-scoped helpers
 * outside its interface, all closing over the same injected `client` instead
 * of a module-level import — the factory-function DI convention (ADR-0037).
 * `createValkeyAdapter(valkeyClient)` below is the app's one production
 * instance; a test passes its own fake client instead.
 */
export const createValkeyAdapter = (client: ValkeyClient) => {
  const readUser = async (userId: string): Promise<AdapterUser | null> => {
    const raw = await client.get(userKey(userId));
    return raw ? fromStoredUser(JSON.parse(raw) as StoredUser) : null;
  };

  /**
   * The Keycloak token set belonging to one Auth.js session (ADR-0030), or
   * null once the session is gone. Outside the standard Adapter interface,
   * which has no per-session notion of an account at all.
   */
  const getSessionAccount = async (sessionToken: string): Promise<AdapterAccount | null> => {
    const raw = await client.get(sessionAccountKey(sessionToken));
    return raw ? (JSON.parse(raw) as AdapterAccount) : null;
  };

  /**
   * Files a freshly-issued token set under the session it was issued for
   * (auth.ts's `events.signIn`). The record expires with its session, so a
   * signed-out or lapsed session leaves no tokens behind.
   */
  const putSessionAccount = async (
    sessionToken: string,
    account: AdapterAccount,
    expires: Date,
  ): Promise<void> => {
    await client.set(sessionAccountKey(sessionToken), JSON.stringify(account), "PXAT", expires.getTime());
  };

  /**
   * Writes a renewed token set back over the session's existing one
   * (lib/api/accessToken.ts). KEEPTTL, not a fresh expiry: the record's
   * lifetime is the session's, and a renewed access token must not extend it.
   *
   * Do not drop the XX. Without it a SET recreates a key that expired or was
   * deleted while the renewal was in flight with Keycloak — and KEEPTTL on a
   * key that does not exist leaves it with no expiry at all, stranding a live
   * refresh token for a session nobody can reach.
   */
  const updateSessionAccount = async (sessionToken: string, account: AdapterAccount): Promise<void> => {
    await client.set(sessionAccountKey(sessionToken), JSON.stringify(account), "KEEPTTL", "XX");
  };

  /**
   * Indexes a session by the Keycloak SSO session id (`sid`) carried in its
   * id_token, so a Back-Channel Logout token — which names a `sid`, not an
   * Auth.js session token — can find the session to end (ADR-0031). Both
   * directions are written: the forward index is what the logout endpoint
   * reads, the reverse is what lets `deleteSession` remove its own forward
   * entry without decoding a token again.
   */
  const putSessionSid = async (sessionToken: string, sid: string, expires: Date): Promise<void> => {
    await client.set(sidIndexKey(sid), sessionToken, "PXAT", expires.getTime());
    await client.set(sessionSidKey(sessionToken), sid, "PXAT", expires.getTime());
  };

  /** The session belonging to a Keycloak SSO session id, or null if none is known. */
  const getSessionTokenBySid = async (sid: string): Promise<string | null> =>
    client.get(sidIndexKey(sid));

  /**
   * Auth.js database-session adapter backed by Valkey (docs/adr/0003-bff-pattern.md).
   * The provider's token set is not part of it: those are stored per session
   * rather than per user (ADR-0030), which the Adapter interface has no notion
   * of, so `linkAccount` records only the lookup index and auth.ts's
   * `events.signIn` files the tokens once the session exists.
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
  const adapter: Adapter = {
    createUser: async (user) => {
      const created: AdapterUser = { ...user, id: crypto.randomUUID() };
      await client.set(userKey(created.id), JSON.stringify(toStoredUser(created)));
      await client.set(emailIndexKey(created.email), created.id);
      return created;
    },

    getUser: (id) => readUser(id),

    getUserByEmail: async (email) => {
      const userId = await client.get(emailIndexKey(email));
      return userId ? readUser(userId) : null;
    },

    getUserByAccount: async ({ provider, providerAccountId }) => {
      const userId = await client.get(accountIndexKey(provider, providerAccountId));
      return userId ? readUser(userId) : null;
    },

    updateUser: async (partialUser) => {
      const existing = await readUser(partialUser.id);
      if (!existing) {
        throw new Error(`Cannot update unknown user ${partialUser.id}`);
      }
      const updated = { ...existing, ...partialUser };
      await client.set(userKey(updated.id), JSON.stringify(toStoredUser(updated)));
      if (updated.email !== existing.email) {
        await client.del(emailIndexKey(existing.email));
        await client.set(emailIndexKey(updated.email), updated.id);
      }
      return updated;
    },

    // Records only the index `getUserByAccount` reads. Auth.js calls this
    // before the session exists (@auth/core's
    // lib/actions/callback/handle-login.js), so it is not a place tokens can
    // be filed under one.
    linkAccount: async (account) => {
      await client.set(accountIndexKey(account.provider, account.providerAccountId), account.userId);
    },

    createSession: async (session) => {
      const stored = toStoredSession({ ...session });
      await client.set(
        sessionKey(session.sessionToken),
        JSON.stringify(stored),
        "PXAT",
        session.expires.getTime(),
      );
      rememberCreatedSession(session);
      return session;
    },

    getSessionAndUser: async (sessionToken) => {
      const raw = await client.get(sessionKey(sessionToken));
      if (!raw) {
        return null;
      }
      const session = fromStoredSession(JSON.parse(raw) as StoredSession);
      const user = await readUser(session.userId);
      return user ? { session, user } : null;
    },

    updateSession: async (partialSession) => {
      const raw = await client.get(sessionKey(partialSession.sessionToken));
      if (!raw) {
        return null;
      }
      const updated = { ...fromStoredSession(JSON.parse(raw) as StoredSession), ...partialSession };
      await client.set(
        sessionKey(updated.sessionToken),
        JSON.stringify(toStoredSession(updated)),
        "PXAT",
        updated.expires.getTime(),
      );
      return updated;
    },

    deleteSession: async (sessionToken) => {
      const raw = await client.get(sessionKey(sessionToken));
      const sid = await client.get(sessionSidKey(sessionToken));
      // One call, so the tokens can never outlive the session record:
      // signing out on one device must not leave a usable refresh token
      // behind (ADR-0030). The sid index is cleaned up alongside it, or a
      // Back-Channel Logout token naming this sid would find a session that
      // no longer exists.
      const keys = [
        sessionKey(sessionToken),
        sessionAccountKey(sessionToken),
        sessionSidKey(sessionToken),
      ];
      if (sid) {
        keys.push(sidIndexKey(sid));
      }
      await client.del(...keys);
      return raw ? fromStoredSession(JSON.parse(raw) as StoredSession) : undefined;
    },
  };

  return {
    adapter,
    getSessionAccount,
    putSessionAccount,
    updateSessionAccount,
    putSessionSid,
    getSessionTokenBySid,
  };
};

const production = createValkeyAdapter(valkeyClient);

export const valkeyAdapter = production.adapter;
export const getSessionAccount = production.getSessionAccount;
export const putSessionAccount = production.putSessionAccount;
export const updateSessionAccount = production.updateSessionAccount;
export const putSessionSid = production.putSessionSid;
export const getSessionTokenBySid = production.getSessionTokenBySid;

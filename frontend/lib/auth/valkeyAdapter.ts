import type { Adapter, AdapterAccount, AdapterSession, AdapterUser } from "next-auth/adapters";
import { rememberCreatedSession } from "./signInContext";
import { valkeyClient } from "./valkeyClient";

// The subset of ioredis's `Redis` this adapter calls (ADR-0037's DI convention).
export type ValkeyClient = {
  get: (key: string) => Promise<string | null>;
  set(key: string, value: string): Promise<string | null>;
  set(key: string, value: string, mode: "NX"): Promise<string | null>;
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

// ADR-0043: bounds how long a losing concurrent createUser waits on the
// winner's write before failing, rather than hanging or creating a duplicate.
const CREATE_USER_CLAIM_TIMEOUT_MS = 2000;
const CREATE_USER_CLAIM_POLL_INTERVAL_MS = 25;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Valkey/JSON has no Date type — records keep date fields as ISO strings.
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

// Closes over an injected client (ADR-0037); the production instance is
// created below, a test passes its own fake client instead.
export const createValkeyAdapter = (client: ValkeyClient) => {
  const readUser = async (userId: string): Promise<AdapterUser | null> => {
    const raw = await client.get(userKey(userId));
    return raw ? fromStoredUser(JSON.parse(raw) as StoredUser) : null;
  };

  // Outside the standard Adapter interface, which has no per-session account (ADR-0030).
  const getSessionAccount = async (sessionToken: string): Promise<AdapterAccount | null> => {
    const raw = await client.get(sessionAccountKey(sessionToken));
    return raw ? (JSON.parse(raw) as AdapterAccount) : null;
  };

  // Filed under the session from auth.ts's events.signIn; expires with the
  // session record, so a lapsed session leaves no tokens behind.
  const putSessionAccount = async (
    sessionToken: string,
    account: AdapterAccount,
    expires: Date,
  ): Promise<void> => {
    await client.set(sessionAccountKey(sessionToken), JSON.stringify(account), "PXAT", expires.getTime());
  };

  // Do not drop the XX: without it, a SET recreates a key that expired or
  // was deleted mid-renewal, and KEEPTTL on a nonexistent key leaves it with
  // no expiry at all — stranding a live refresh token nobody can reach.
  const updateSessionAccount = async (sessionToken: string, account: AdapterAccount): Promise<void> => {
    await client.set(sessionAccountKey(sessionToken), JSON.stringify(account), "KEEPTTL", "XX");
  };

  // A Back-Channel Logout token names a `sid`, not an Auth.js session token
  // (ADR-0031); both directions are written so `deleteSession` can clean up
  // its forward entry without decoding a token again.
  const putSessionSid = async (sessionToken: string, sid: string, expires: Date): Promise<void> => {
    await client.set(sidIndexKey(sid), sessionToken, "PXAT", expires.getTime());
    await client.set(sessionSidKey(sessionToken), sid, "PXAT", expires.getTime());
  };

  const getSessionTokenBySid = async (sid: string): Promise<string | null> =>
    client.get(sidIndexKey(sid));

  // Polls for the record a concurrent createUser is in the process of
  // writing, so the request that lost the email-index claim below resolves
  // to the winner's user instead of orphaning one of its own.
  const waitForClaimedUser = async (email: string): Promise<AdapterUser> => {
    const deadline = Date.now() + CREATE_USER_CLAIM_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const winnerId = await client.get(emailIndexKey(email));
      const winner = winnerId ? await readUser(winnerId) : null;
      if (winner) {
        return winner;
      }
      await sleep(CREATE_USER_CLAIM_POLL_INTERVAL_MS);
    }
    throw new Error(`Timed out waiting for a concurrent sign-in to finish creating a user for ${email}`);
  };

  // Auth.js database-session adapter backed by Valkey (ADR-0030).
  //
  // getUserByEmail is implemented despite this being OAuth-only: @auth/core's
  // lib/utils/assert.js requires it unconditionally for the "database"
  // strategy regardless of provider — confirmed by running the sign-in flow,
  // not documented in the adapter type's own "currently invoked" notes.
  const adapter: Adapter = {
    // Claims the email index with SET NX first — ioredis's compare-and-set
    // primitive, since the Adapter interface has no equivalent (ADR-0043) —
    // and only the request that wins it writes the user record. A losing
    // request waits for that record instead of creating its own.
    createUser: async (user) => {
      const created: AdapterUser = { ...user, id: crypto.randomUUID() };
      const claimed = await client.set(emailIndexKey(created.email), created.id, "NX");
      if (claimed !== "OK") {
        return waitForClaimedUser(created.email);
      }
      // The claim above is ours alone until the write below settles — if it
      // rejects, releasing the claim lets a retry win instead of permanently
      // locking the email out (a losing request only ever waits, never steals).
      try {
        await client.set(userKey(created.id), JSON.stringify(toStoredUser(created)));
      } catch (error) {
        await client.del(emailIndexKey(created.email));
        throw error;
      }
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

    // Auth.js calls this before the session exists (@auth/core's
    // lib/actions/callback/handle-login.js), so tokens can't be filed here.
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
      // One call, so tokens can't outlive the session (ADR-0030); the sid
      // index goes too, or a stale logout token would find nothing to end.
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

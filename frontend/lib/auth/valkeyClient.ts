import Redis from "ioredis";

/**
 * A single persistent connection, reused across requests — unlike
 * kaliaFetch's per-call env read (lib/api/mutator.ts), ioredis manages its
 * own connection lifecycle/reconnection and is designed to be instantiated
 * once, not per call. lazyConnect defers the actual TCP connection until
 * the first command, so importing this module (e.g. during a build or test
 * collection) never attempts a connection on its own.
 */
export const valkeyClient = new Redis(process.env.VALKEY_URL ?? "redis://localhost:6379", {
  lazyConnect: true,
});

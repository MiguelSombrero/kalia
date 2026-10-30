import Redis from "ioredis";

// Single persistent connection, reused across requests (ioredis's own
// design). lazyConnect defers the TCP connection to the first command, so
// importing this during a build never connects on its own.
export const valkeyClient = new Redis(process.env.VALKEY_URL ?? "redis://localhost:6379", {
  lazyConnect: true,
});

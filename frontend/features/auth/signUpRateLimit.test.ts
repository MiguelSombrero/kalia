import { describe, expect, it } from "vitest";
import { createSignUpRateLimiter, type RateLimitClient } from "./signUpRateLimit";

// A fake standing in for Valkey's INCR / EXPIRE NX, not a real client — this
// is what makes the limiter's threshold and window logic testable without
// Docker. `expireBefore` drops the key just ahead of that command, which is
// how a window ending between the limiter's two calls is reproduced.
const fakeClient = (expireBefore?: "incr" | "expire") => {
  const key = { count: 0, ttl: null as number | null };
  const expireKey = () => {
    key.count = 0;
    key.ttl = null;
  };
  const client: RateLimitClient = {
    incr: async () => {
      if (expireBefore === "incr") expireKey();
      return ++key.count;
    },
    expire: async (_key, seconds, flag) => {
      if (expireBefore === "expire") expireKey();
      if (key.count === 0) return 0;
      if (flag === "NX" && key.ttl !== null) return 0;
      key.ttl = seconds;
      return 1;
    },
  };
  return { client, key };
};

describe("createSignUpRateLimiter", () => {
  it("allows attempts up to the threshold", async () => {
    const limiter = createSignUpRateLimiter(fakeClient().client);

    for (let attempt = 1; attempt <= 20; attempt++) {
      expect(await limiter()).toBe(true);
    }
  });

  it("refuses once the threshold is crossed", async () => {
    const limiter = createSignUpRateLimiter(fakeClient().client);

    for (let attempt = 1; attempt <= 20; attempt++) {
      await limiter();
    }

    expect(await limiter()).toBe(false);
  });

  it("gives the window its expiry on the first attempt", async () => {
    const { client, key } = fakeClient();

    await createSignUpRateLimiter(client)();

    expect(key).toEqual({ count: 1, ttl: 10 * 60 });
  });

  it("sets the expiry only where none exists, so a later attempt does not extend the window", async () => {
    const calls: unknown[][] = [];
    const { client } = fakeClient();
    const limiter = createSignUpRateLimiter({
      ...client,
      expire: async (...args) => {
        calls.push(args);
        return client.expire(...args);
      },
    });

    await limiter();
    await limiter();

    expect(calls).toEqual([
      ["auth:sign-up-rate", 10 * 60, "NX"],
      ["auth:sign-up-rate", 10 * 60, "NX"],
    ]);
  });

  it("leaves the counter an expiry when the window ends just before the INCR", async () => {
    const { client, key } = fakeClient("incr");
    const limiter = createSignUpRateLimiter(client);

    await limiter();
    await limiter();

    expect(key.count).toBeGreaterThan(0);
    expect(key.ttl).not.toBeNull();
  });

  it("leaves no counter without an expiry when the window ends between the INCR and the EXPIRE", async () => {
    const { client, key } = fakeClient("expire");
    const limiter = createSignUpRateLimiter(client);

    await limiter();

    expect(key.count === 0 || key.ttl !== null).toBe(true);
  });
});

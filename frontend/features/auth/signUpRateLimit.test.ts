import { describe, expect, it } from "vitest";
import { createSignUpRateLimiter, type RateLimitClient } from "./signUpRateLimit";

// A fake standing in for Valkey's INCR / EXPIRE NX, not a real client — this
// is what makes the limiter's threshold and window logic testable without
// Docker. `dropKeyBefore` makes the key expire once, just ahead of the named
// command, which is how a window ending between the limiter's two calls is
// reproduced.
const fakeClient = () => {
  const key = { count: 0, ttl: null as number | null };
  let drop: "incr" | "expire" | null = null;
  const dropIfDue = (command: "incr" | "expire") => {
    if (drop !== command) return;
    drop = null;
    key.count = 0;
    key.ttl = null;
  };
  const client: RateLimitClient = {
    incr: async () => {
      dropIfDue("incr");
      return ++key.count;
    },
    expire: async (_key, seconds, flag) => {
      dropIfDue("expire");
      if (key.count === 0) return 0;
      if (flag === "NX" && key.ttl !== null) return 0;
      key.ttl = seconds;
      return 1;
    },
  };
  return {
    client,
    key,
    dropKeyBefore: (command: "incr" | "expire") => {
      drop = command;
    },
  };
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
    const { client, key } = fakeClient();
    const limiter = createSignUpRateLimiter(client);

    await limiter();
    key.ttl = 120;
    await limiter();

    expect(key).toEqual({ count: 2, ttl: 120 });
  });

  it("gives the recreated counter an expiry when the window ends just before the INCR", async () => {
    const { client, key, dropKeyBefore } = fakeClient();
    const limiter = createSignUpRateLimiter(client);
    await limiter();

    dropKeyBefore("incr");
    await limiter();

    expect(key).toEqual({ count: 1, ttl: 10 * 60 });
  });

  it("leaves no counter without an expiry when the window ends between the INCR and the EXPIRE", async () => {
    const { client, key, dropKeyBefore } = fakeClient();
    const limiter = createSignUpRateLimiter(client);
    await limiter();

    dropKeyBefore("expire");
    await limiter();
    expect(key).toEqual({ count: 0, ttl: null });

    await limiter();
    expect(key).toEqual({ count: 1, ttl: 10 * 60 });
  });
});

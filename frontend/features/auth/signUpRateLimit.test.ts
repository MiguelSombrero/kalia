import { describe, expect, it } from "vitest";
import { createSignUpRateLimiter, type RateLimitClient } from "./signUpRateLimit";

// A fake standing in for Valkey's SET NX EX / INCR, not a real client — this
// is what makes the limiter's threshold and window logic testable without
// Docker.
const fakeClient = (): RateLimitClient => {
  let count = 0;
  return {
    set: async () => {
      if (count > 0) return null;
      count = 1;
      return "OK";
    },
    incr: async () => ++count,
  };
};

describe("createSignUpRateLimiter", () => {
  it("allows attempts up to the threshold", async () => {
    const limiter = createSignUpRateLimiter(fakeClient());

    for (let attempt = 1; attempt <= 20; attempt++) {
      expect(await limiter()).toBe(true);
    }
  });

  it("refuses once the threshold is crossed", async () => {
    const limiter = createSignUpRateLimiter(fakeClient());

    for (let attempt = 1; attempt <= 20; attempt++) {
      await limiter();
    }

    expect(await limiter()).toBe(false);
  });

  it("creates the window with SET NX EX rather than a separate INCR+EXPIRE step", async () => {
    const setCalls: unknown[][] = [];
    const incrCalls: unknown[][] = [];
    const client: RateLimitClient = {
      set: async (...args) => {
        setCalls.push(args);
        return "OK";
      },
      incr: async (...args) => {
        incrCalls.push(args);
        return 2;
      },
    };
    const limiter = createSignUpRateLimiter(client);

    await limiter();

    expect(setCalls).toEqual([["auth:sign-up-rate", "1", "EX", 10 * 60, "NX"]]);
    expect(incrCalls).toHaveLength(0);
  });

  it("falls back to INCR once the window already exists", async () => {
    const client: RateLimitClient = {
      set: async () => null,
      incr: async () => 5,
    };
    const limiter = createSignUpRateLimiter(client);

    expect(await limiter()).toBe(true);
  });
});

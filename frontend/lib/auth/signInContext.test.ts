import type { AdapterSession } from "next-auth/adapters";
import { describe, expect, it } from "vitest";
import { createdSession, rememberCreatedSession, withSignInContext } from "./signInContext";

const session = (sessionToken: string): AdapterSession => ({
  sessionToken,
  userId: "user-1",
  expires: new Date(Date.now() + 60_000),
});

describe("withSignInContext", () => {
  it("carries the created session across the awaits Auth.js makes between them", async () => {
    const seen = await withSignInContext(async () => {
      rememberCreatedSession(session("tok-1"));
      await Promise.resolve();
      return createdSession();
    });

    expect(seen?.sessionToken).toBe("tok-1");
  });

  it("has nothing to report when no session was created this request", async () => {
    const seen = await withSignInContext(async () => createdSession());

    expect(seen).toBeUndefined();
  });

  // Load-bearing: two browsers signing in at once run through the same module,
  // and the whole point of ADR-0030 is that their tokens do not mix.
  it("keeps concurrent sign-ins from seeing each other's session", async () => {
    const signInAs = (sessionToken: string, delayMs: number) =>
      withSignInContext(async () => {
        rememberCreatedSession(session(sessionToken));
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return createdSession();
      });

    const [laptop, phone] = await Promise.all([signInAs("tok-laptop", 5), signInAs("tok-phone", 0)]);

    expect(laptop?.sessionToken).toBe("tok-laptop");
    expect(phone?.sessionToken).toBe("tok-phone");
  });
});

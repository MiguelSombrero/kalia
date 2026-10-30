import { valkeyClient } from "@/lib/auth/valkeyClient";

// The subset ioredis's `Redis` this needs (ADR-0037's DI convention, same
// shape of seam as lib/auth/valkeyAdapter.ts's ValkeyClient).
export type RateLimitClient = {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number, mode: "NX") => Promise<number>;
};

const WINDOW_SECONDS = 10 * 60;
const MAX_ATTEMPTS = 20;
const KEY = "auth:sign-up-rate";

// One shared counter, not per-visitor, because the budget it protects is
// itself global (Gmail's send quota, ADR-0055): one abusive run using it up is
// the outcome to prevent, not a side effect. The per-address bound on
// registration is the edge proxy's (ADR-0090).
//
// Do not call EXPIRE only when INCR returns 1: an INCR that finds the key
// just expired recreates it with no expiry, and every sign-up is then refused
// for good. NX keeps a later attempt from pushing the window's end out.
export const createSignUpRateLimiter = (client: RateLimitClient) => {
  return async (): Promise<boolean> => {
    const count = await client.incr(KEY);
    await client.expire(KEY, WINDOW_SECONDS, "NX");
    return count <= MAX_ATTEMPTS;
  };
};

export const checkSignUpRateLimit = createSignUpRateLimiter(valkeyClient);

import { valkeyClient } from "@/lib/auth/valkeyClient";

// The subset ioredis's `Redis` this needs (ADR-0037's DI convention, same
// shape of seam as lib/auth/valkeyAdapter.ts's ValkeyClient).
export type RateLimitClient = {
  set: (key: string, value: string, mode: "EX", seconds: number, flag: "NX") => Promise<string | null>;
  incr: (key: string) => Promise<number>;
};

const WINDOW_SECONDS = 10 * 60;
const MAX_ATTEMPTS = 20;
const KEY = "auth:sign-up-rate";

// One shared counter, not per-visitor: this stack has no reverse proxy in
// front of Next.js, so there is no header a caller can't forge to claim a
// fresh identity (x-forwarded-for included) — a per-identity limiter here
// would be a bypassable limiter, not a basic one. A global counter can't be
// evaded that way, at the cost of one abusive run using up everyone's
// budget; that budget is itself global (Gmail's send quota, ADR-0055), so
// this is what the limit is actually protecting.
//
// SET NX EX, not a separate INCR+EXPIRE: the first attempt in a window
// creates the counter and its expiry in one atomic command, so there is no
// step between them where a crash or a dropped connection could leave the
// key permanently un-expiring — which would otherwise lock every future
// sign-up out forever, not just the current window's.
export const createSignUpRateLimiter = (client: RateLimitClient) => {
  return async (): Promise<boolean> => {
    const created = await client.set(KEY, "1", "EX", WINDOW_SECONDS, "NX");
    const count = created === "OK" ? 1 : await client.incr(KEY);
    return count <= MAX_ATTEMPTS;
  };
};

export const checkSignUpRateLimit = createSignUpRateLimiter(valkeyClient);

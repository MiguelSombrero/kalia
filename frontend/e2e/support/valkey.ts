import type Redis from "ioredis";

// The published host port, like origins.ts's two origins: the suite runs on
// the host, not inside the compose network.
export const VALKEY_URL = "redis://localhost:6379";

// features/auth/signUpRateLimit.ts's key, spelled out rather than imported —
// e2e/ sits outside every layer eslint.config.mjs knows (ADR-0012), the same
// reason sign-up.spec.ts spells out `auth:session:`.
const SIGN_UP_RATE_KEY = "auth:sign-up-rate";

// Do not stop calling this. ADR-0055's limiter is one counter for every
// visitor, 20 attempts per 10 minutes, and the suite spends about five per run
// with nothing clearing them in between — a spent budget turns every
// registering spec into an unexplained `#username` timeout
// (docs/ci-playbook.md).
export const clearSignUpRateLimit = async (valkey: Redis): Promise<void> => {
  await valkey.del(SIGN_UP_RATE_KEY);
};

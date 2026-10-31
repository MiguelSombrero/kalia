#!/usr/bin/env node
// Prints the origins the mobile app reads (mobile/src/lib/config/origins.ts)
// for this checkout's stack, as KEY=value lines for `env`:
//   env $(node scripts/mobile-env.mjs) npm start --workspace mobile
// The ports come from stack-ports.mjs, so a worktree's own .env decides them
// and nothing in mobile/ names one.

import { fileURLToPath } from "node:url";

import { originOf, stackEnv } from "./stack-ports.mjs";

export const mobileEnv = (env) => ({
  EXPO_PUBLIC_API_ORIGIN: originOf(env, "BACKEND_PORT"),
  EXPO_PUBLIC_KEYCLOAK_ORIGIN: originOf(env, "KEYCLOAK_PORT"),
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [name, value] of Object.entries(mobileEnv(stackEnv()))) {
    console.log(`${name}=${value}`);
  }
}

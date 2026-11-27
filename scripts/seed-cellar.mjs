#!/usr/bin/env node
// Puts the seeded account's cellar into a known state through the API, so a
// mobile flow can read it without driving the screens that fill it
// (mobile/.maestro/, ADR-0096). It signs in as the public `kalia-mobile`
// client does, because the backend accepts only a token whose audience is
// `kalia-backend` (ADR-0028), and never touches the database.
//
//   node scripts/seed-cellar.mjs

import { fileURLToPath } from "node:url";

import { signIn } from "./check-keycloak-pkce-flow.mjs";
import { withRetry } from "./keycloak-admin.mjs";
import { originOf, stackEnv } from "./stack-ports.mjs";

export const SEED_USERNAME = "testuser";
const SEED_PASSWORD = "testuser123";

// Each beer is named as the catalog names it. The totals the flow reads,
// "3 beers · 6 bottles", are these entries' sum: change one, change the other.
export const SEEDED_CELLAR = [
  { beer: "Lapin Kulta", containerType: "BOTTLE", quantity: 3, bestBeforeDate: "2031-06-30" },
  { beer: "Lapin Kulta Premium Export", containerType: "CAN", quantity: 1 },
  { beer: "Baltic G Porter", containerType: "BOTTLE", quantity: 2, bestBeforeDate: "2030-01-31" },
];

export const SEEDED_TOTALS = {
  beers: SEEDED_CELLAR.length,
  bottles: SEEDED_CELLAR.reduce((sum, item) => sum + item.quantity, 0),
};

const call = async (api, token, method, path, body) => {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`${method} ${path} answered ${response.status}: ${await response.text()}`);
  return response.status === 204 ? undefined : response.json();
};

export const findBeerId = (page, name) => {
  const exact = page.content.filter((beer) => beer.name === name);
  if (exact.length !== 1) throw new Error(`the catalog holds ${exact.length} beers named ${name}, not one`);
  return exact[0].id;
};

export const seedCellar = async ({ api = originOf(stackEnv(), "BACKEND_PORT") } = {}) => {
  const { access_token: token } = await withRetry(() => signIn({ username: SEED_USERNAME, password: SEED_PASSWORD }), { attempts: 15, delayMs: 2000 });
  const held = await call(api, token, "GET", "/api/v1/cellar");
  for (const entry of held) {
    for (const bottle of entry.bottles) await call(api, token, "DELETE", `/api/v1/cellar/bottles/${bottle.id}`);
  }
  for (const { beer, ...bottle } of SEEDED_CELLAR) {
    const page = await call(api, token, "GET", `/api/v1/beers?query=${encodeURIComponent(beer)}&size=100`);
    await call(api, token, "POST", "/api/v1/cellar/bottles", { beerId: findBeerId(page, beer), ...bottle });
  }
  const seeded = await call(api, token, "GET", "/api/v1/cellar");
  const bottles = seeded.reduce((sum, entry) => sum + entry.quantity, 0);
  if (seeded.length !== SEEDED_TOTALS.beers || bottles !== SEEDED_TOTALS.bottles) {
    throw new Error(`the seeded cellar holds ${seeded.length} beers and ${bottles} bottles, not ${SEEDED_TOTALS.beers} and ${SEEDED_TOTALS.bottles}`);
  }
  return SEEDED_TOTALS;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedCellar()
    .then(({ beers, bottles }) => console.log(`Seeded ${SEED_USERNAME}'s cellar: ${beers} beers, ${bottles} bottles`))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

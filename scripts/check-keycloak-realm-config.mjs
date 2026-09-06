#!/usr/bin/env node
// Asserts the running realm still matches keycloak/realm-export.json — every
// value the committed file pins is compared against what the admin REST API
// reports, with $(env:...) placeholders resolved the way the keycloak-config
// service resolves them.
//
// Two things this is, depending on when it runs (ADR-0054):
//   - a drift check, run against a persistent dev stack before keycloak-config
//     reconciles it — a realm setting changed only in the admin console makes
//     this exit non-zero (`make keycloak-check` runs it ahead of the reconcile
//     for exactly that reason);
//   - an import check, run just after keycloak-config (CI's keycloak-realm-check)
//     — a broken $(env:...) substitution or an unresolved variable shows up as
//     a mismatch against the file's intent.
//
// It never reads keycloak/realm-export.json back as the state of the running
// realm — that would miss both the substitution bugs and the console edits it
// exists to catch. The file is the expectation; Keycloak's API is the
// observation.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REALM_FILE = resolve(ROOT, "keycloak/realm-export.json");

// Mirrors docker-compose.yml's keycloak-config service: every value it gives
// a `:-` default, this gives the same default, so the check runs without
// compose. KALIA_FRONTEND_CLIENT_SECRET has no default there — an unset one
// is an error, not a skipped field. The SMTP block is different: its `:-`
// defaults point at the mailpit container and an empty user/password is the
// no-auth local state, not a missing secret — a deployment overrides them to
// reach a real sender.
const ENV_DEFAULTS = {
  KEYCLOAK_SSL_REQUIRED: "none",
  FRONTEND_URL: "http://localhost:3000",
  KEYCLOAK_SMTP_HOST: "mailpit",
  KEYCLOAK_SMTP_PORT: "1025",
  KEYCLOAK_SMTP_FROM: "no-reply@kalia.test",
  KEYCLOAK_SMTP_AUTH: "false",
  KEYCLOAK_SMTP_STARTTLS: "false",
  KEYCLOAK_SMTP_SSL: "false",
  KEYCLOAK_SMTP_USER: "",
  KEYCLOAK_SMTP_PASSWORD: "",
};

// Loads the root .env the same way `docker compose` does, so running this
// script directly against a persistent stack needs no extra `export`. Values
// already in the environment win, as they do for compose.
const loadDotEnv = () => {
  let text;
  try {
    text = readFileSync(resolve(ROOT, ".env"), "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2];
    }
  }
};

// Resolves keycloak-config-cli's $(env:VAR) / $(env:VAR:-default) placeholders
// through strings, arrays and objects. An unset variable with no default is
// the "healthy Keycloak, broken credential" failure ADR-0054's Evidence
// describes — surfaced here rather than compared as a literal. An empty value
// counts as unset, matching docker-compose.yml's `${VAR:-default}` / `${VAR:?}`.
export const resolvePlaceholders = (value, env) => {
  if (typeof value === "string") {
    return value.replace(/\$\(env:([A-Za-z_][A-Za-z0-9_]*)(?::-([^)]*))?\)/g, (_, name, fallback) => {
      const fromEnv = env[name] === "" ? undefined : env[name];
      const resolved = fromEnv ?? ENV_DEFAULTS[name] ?? fallback;
      if (resolved === undefined) {
        throw new Error(
          `keycloak/realm-export.json references $(env:${name}), which is unset and has no default — ` +
            `set it in the environment or the root .env (see README.md)`,
        );
      }
      return resolved;
    });
  }
  if (Array.isArray(value)) return value.map((item) => resolvePlaceholders(item, env));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolvePlaceholders(item, env)]));
  }
  return value;
};

// Compares the committed realm (a partial spec) against observed live state.
// The file is treated as a set of assertions: every scalar it pins must equal
// the live value, every array it lists must match as a set (an entry added in
// the console — an extra redirect URI, say — is drift too), every object it
// describes is recursed into — but an object *key* the file does not mention
// is not checked, so Keycloak's own defaults and generated ids never register
// as drift. Returns the mismatches and how many comparisons were made; zero
// comparisons means the file pinned nothing and the check is vacuous.
export const diffRealm = (spec, live) => {
  const mismatches = [];
  let compared = 0;
  const serialise = (value) => JSON.stringify(value);

  const compare = (path, want, got) => {
    if (Array.isArray(want)) {
      compared++;
      const gotArray = Array.isArray(got) ? got : [];
      const has = (list, item) => list.some((candidate) => serialise(candidate) === serialise(item));
      for (const element of want) {
        if (!has(gotArray, element)) mismatches.push(`${path}: live ${serialise(got)} is missing ${serialise(element)}`);
      }
      for (const element of gotArray) {
        if (!has(want, element)) mismatches.push(`${path}: live has ${serialise(element)}, which the committed file does not list`);
      }
      return;
    }
    if (want !== null && typeof want === "object") {
      if (got === null || typeof got !== "object") {
        compared++;
        mismatches.push(`${path}: committed an object, live is ${serialise(got)}`);
        return;
      }
      for (const [key, value] of Object.entries(want)) compare(`${path}.${key}`, value, got[key]);
      return;
    }
    compared++;
    // A committed value that resolved to "" (an unset $(env:...) with an
    // empty default — SMTP auth off locally, say) asserts nothing: Keycloak
    // drops empty smtpServer entries on import, so "" and absent are one
    // state. A non-empty live value where "" was committed is still drift.
    if (want === "") {
      if (got === undefined || got === null || got === "") return;
      mismatches.push(`${path}: committed empty, live is ${serialise(got)}`);
      return;
    }
    if (want !== got) mismatches.push(`${path}: committed ${serialise(want)} != live ${serialise(got)}`);
  };

  for (const [key, value] of Object.entries(spec)) {
    if (key === "realm" || key === "clients") continue;
    if (key === "smtpServer" && value !== null && typeof value === "object") {
      // Keycloak returns smtpServer.password masked as "**********" on every
      // read (a client secret, by contrast, comes back in full), so it can
      // never be compared — drop it before diffing.
      const { password: _password, ...pinnable } = value;
      compare("realm.smtpServer", pinnable, live.realm?.smtpServer ?? {});
      continue;
    }
    compare(`realm.${key}`, value, live.realm?.[key]);
  }

  for (const specClient of spec.clients ?? []) {
    const clientId = specClient.clientId;
    const liveClient = live.clients?.[clientId];
    if (!liveClient) {
      compared++;
      mismatches.push(`client "${clientId}": pinned in keycloak/realm-export.json but absent from the live realm`);
      continue;
    }
    for (const [key, value] of Object.entries(specClient)) {
      if (key === "clientId") continue;
      if (key === "protocolMappers") {
        // Keyed by name, not position: Keycloak returns them in its own order
        // and adds an `id` the file does not carry.
        const liveMappers = liveClient.protocolMappers ?? [];
        const specNames = new Set(value.map((mapper) => mapper.name));
        for (const specMapper of value) {
          compared++;
          const liveMapper = liveMappers.find((candidate) => candidate.name === specMapper.name);
          if (!liveMapper) {
            mismatches.push(`client "${clientId}" protocolMapper "${specMapper.name}": missing from the live realm`);
            continue;
          }
          compare(`client "${clientId}" protocolMapper "${specMapper.name}"`, specMapper, liveMapper);
        }
        for (const liveMapper of liveMappers) {
          if (!specNames.has(liveMapper.name)) {
            mismatches.push(
              `client "${clientId}" protocolMapper "${liveMapper.name}": present live, not in the committed file`,
            );
          }
        }
        continue;
      }
      compare(`client "${clientId}".${key}`, value, liveClient[key]);
    }
  }

  return { mismatches, compared };
};

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://localhost:8081";
const REALM = process.env.KEYCLOAK_REALM ?? "kalia";
const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN ?? "admin";
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";

const adminToken = async () => {
  const response = await fetch(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "admin-cli",
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    }),
  });
  if (!response.ok) {
    throw new Error(`could not obtain a Keycloak admin token: ${response.status} ${await response.text()}`);
  }
  const { access_token: token } = await response.json();
  return token;
};

const fetchJson = async (token, path) => {
  const response = await fetch(`${KEYCLOAK_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
};

// Assembles the observed side of the comparison: the realm representation
// plus the full representation of every client the committed file pins.
const fetchLiveRealm = async (clientIds) => {
  const token = await adminToken();
  const realm = await fetchJson(token, `/admin/realms/${REALM}`);
  const clients = {};
  for (const clientId of clientIds) {
    const [client] = await fetchJson(
      token,
      `/admin/realms/${REALM}/clients?clientId=${encodeURIComponent(clientId)}`,
    );
    if (client) clients[clientId] = client;
  }
  return { realm, clients };
};

const run = async () => {
  loadDotEnv();

  const committed = resolvePlaceholders(JSON.parse(readFileSync(REALM_FILE, "utf8")), process.env);
  const clientIds = (committed.clients ?? []).map((client) => client.clientId);

  // The fetch is retried for the transient 503 in the window right after
  // Keycloak reports healthy, the same one check-keycloak-signin.mjs rides
  // out. Mismatches get exactly one recheck after a short pause: a genuine
  // drift is still there a moment later, but a read that caught Keycloak's
  // realm cache mid-write clears — retrying a real mismatch to exhaustion
  // would just burn 30 seconds before failing anyway.
  const attempts = 15;
  const delayMs = 2000;
  const fetchWithRetry = async () => {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await fetchLiveRealm(clientIds);
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    console.error(lastError.message);
    process.exit(1);
  };

  let { mismatches, compared } = diffRealm(committed, await fetchWithRetry());
  if (mismatches.length > 0) {
    await new Promise((r) => setTimeout(r, delayMs));
    ({ mismatches, compared } = diffRealm(committed, await fetchWithRetry()));
  }

  if (compared === 0) {
    console.error(
      "compared nothing: keycloak/realm-export.json pins no realm setting or client field this check understands",
    );
    process.exit(1);
  }
  if (mismatches.length > 0) {
    console.error(
      `realm ${REALM} has drifted from keycloak/realm-export.json (${mismatches.length} of ${compared} checks failed):`,
    );
    for (const mismatch of mismatches) console.error(`  ${mismatch}`);
    console.error(
      "\nre-apply the committed file over the realm with `docker compose up -d --wait keycloak-config` " +
        "(it reconciles on every run — ADR-0054), then re-check after a moment for Keycloak's realm cache to settle",
    );
    process.exit(1);
  }

  console.log(
    `realm ${REALM} matches keycloak/realm-export.json (${compared} values checked across ${clientIds.length} client(s))`,
  );
};

// import.meta.main is still behind a flag on this Node; compare argv instead
// so the self-test can import diffRealm/resolvePlaceholders without running.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

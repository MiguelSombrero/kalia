#!/usr/bin/env node
// Asserts the split ADR-0089 makes between the deployable compose definition
// (docker-compose.base.yml) and the local stack (docker-compose.yml, its dev
// env file and docker-compose.override.yml). Needs the `docker compose` CLI
// but no daemon: it only renders configuration. Run by `make compose-check`
// (`make verify`, CI's static-checks job).
//
// It proves that the base file refuses to render without any one of its
// required secrets, naming that variable; that it defaults none the dev env
// file supplies and has no seed service or Swagger client; and that the local
// stack renders from the root .env's one secret alone. It also proves that an
// image added to the base file reaches the vulnerability scan's matrix.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderMatrix } from "./scan-images.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** Variables a compose file refuses to render without: `${NAME:?message}`. */
export const requiredVariables = (composeText) => [
  ...new Set([...composeText.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*):\?/g)].map((match) => match[1])),
];

/** The names a dev env file gives a value, in order. */
export const variablesSupplied = (envText) =>
  [...envText.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)].map((match) => match[1]);

/** Variables given a non-empty `:-` default somewhere in a compose file. */
export const variablesWithDefault = (composeText) => [
  ...new Set([...composeText.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*):-(?!\})/g)].map((match) => match[1])),
];

/**
 * What docker-compose.dev.env supplies for docker-compose.override.yml alone:
 * the development admin's password (ADR-0101), which the base file must never
 * read, since it seeds no account.
 */
export const OVERRIDE_VARIABLES = ["KALIA_DEV_ADMIN_PASSWORD"];

export const variableValue = (envText, name) =>
  envText.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*?)\\s*$`, "m"))?.[1];

/** Problems with how the dev env file and the base file line up. */
export const consistencyProblems = ({ baseText, devEnvText }) => {
  const required = new Set(requiredVariables(baseText));
  const defaulted = new Set(variablesWithDefault(baseText));
  const problems = [];
  for (const name of variablesSupplied(devEnvText)) {
    if (defaulted.has(name)) {
      problems.push(`docker-compose.base.yml gives ${name} a \`:-\` default, which docker-compose.dev.env already supplies`);
    }
    if (!OVERRIDE_VARIABLES.includes(name) && !baseText.includes("${" + name)) {
      problems.push(`docker-compose.dev.env supplies ${name}, which docker-compose.base.yml does not use`);
    }
  }
  return problems;
};

/** Problems with the deployable definition seeding any account: it seeds none, the development admin least (ADR-0101). */
export const deployableSeedProblems = ({ baseText, services }) => {
  const rendered = JSON.stringify(services);
  const problems = [];
  // The base file's comments may name the seed script; only a service running it seeds.
  for (const needle of ["seed-keycloak-account", "testadmin", ...OVERRIDE_VARIABLES]) {
    if ((needle !== "seed-keycloak-account" && baseText.includes(needle)) || rendered.includes(needle)) {
      problems.push(`the base file mentions ${needle}, so a deployment would seed a development account`);
    }
  }
  return problems;
};

/** Problems with the local stack seeding `testadmin` with the role and `testuser` with none (ADR-0101). */
export const localSeedProblems = (seed, devEnvText) => {
  if (!seed) return ["the local stack has no keycloak-seed service"];
  const problems = [];
  const [name] = OVERRIDE_VARIABLES;
  const entrypoint = (seed.entrypoint ?? []).join(" ");
  const wanted = variableValue(devEnvText, name);
  if (!wanted) problems.push(`docker-compose.dev.env does not give ${name}`);
  else {
    if (seed.environment?.[name] !== wanted) problems.push(`keycloak-seed's ${name} differs from the value docker-compose.dev.env holds`);
    if (entrypoint.includes(wanted)) problems.push(`keycloak-seed spells the development admin's password out instead of reading ${name}`);
  }
  if (!new RegExp(`seed-keycloak-account\\.mjs testadmin "\\$\\$?${name}" admin(\\s|$)`).test(entrypoint)) {
    problems.push("keycloak-seed does not seed testadmin with the admin role");
  }
  if (!/seed-keycloak-account\.mjs testuser \S+ (&&|$)/.test(entrypoint)) {
    problems.push("keycloak-seed seeds testuser with something beyond a password");
  }
  return problems;
};

/** The services behind the edge proxy (ADR-0090): none of them may publish a port. */
export const BEHIND_EDGE = ["web", "backend", "keycloak"];

/** Problems with who faces the host in a rendered configuration's `services`. */
export const edgeProblems = (services) => {
  const problems = [];
  if (!services.edge) problems.push("there is no edge service to publish the web app, backend and Keycloak");
  for (const name of BEHIND_EDGE) {
    if ((services[name]?.ports ?? []).length > 0) {
      problems.push(`${name} publishes a port, so it can be reached without passing the edge proxy`);
    }
  }
  const keycloak = services.keycloak?.environment ?? {};
  if (keycloak.KC_PROXY_HEADERS !== "xforwarded" || !keycloak.KC_PROXY_TRUSTED_ADDRESSES) {
    problems.push("keycloak does not take the client address from X-Forwarded-For only from trusted addresses");
  }
  return problems;
};

/** Services that only development runs: the deployable definition must not (the mail catcher). */
const DEV_ONLY_SERVICES = ["mailpit"];

/** Services whose host port only development needs: the deployable definition publishes none. */
const DEV_ONLY_PORTS = ["postgres", "valkey"];

/** Problems with what the deployable definition runs or publishes for development's sake alone. */
export const devOnlyProblems = (services) => {
  const problems = [];
  for (const name of DEV_ONLY_SERVICES) {
    if (name in services) problems.push(`the base file runs ${name}, a dev-only service`);
  }
  for (const name of DEV_ONLY_PORTS) {
    if ((services[name]?.ports ?? []).length > 0) problems.push(`${name} publishes a port, which only the dev overlay may`);
  }
  return problems;
};

/** Problems with who each service connects to Postgres as: three roles of their own, never the bootstrap superuser. */
export const roleProblems = (services) => {
  const superuser = services.postgres?.environment?.POSTGRES_USER;
  const connectsAs = {
    "the backend (runtime)": services.backend?.environment?.DATABASE_USERNAME,
    "the backend (Flyway)": services.backend?.environment?.DATABASE_OWNER_USERNAME,
    keycloak: services.keycloak?.environment?.KC_DB_USERNAME,
  };
  const problems = [];
  const seen = new Map();
  for (const [who, role] of Object.entries(connectsAs)) {
    if (!role) problems.push(`${who} does not name the Postgres role it connects as`);
    else if (role === superuser) problems.push(`${who} connects as ${role}, the Postgres superuser`);
    else if (seen.has(role)) problems.push(`${who} and ${seen.get(role)} connect as the same role, ${role}`);
    else seen.set(role, who);
  }
  for (const name of ["backend", "keycloak"]) {
    if ("POSTGRES_PASSWORD" in (services[name]?.environment ?? {})) {
      problems.push(`${name} is given POSTGRES_PASSWORD, the superuser's, which only Postgres's bootstrap may hold`);
    }
  }
  return problems;
};

/** What the local stack publishes for a developer's host, with the container port each answers on. */
const LOCAL_DEV_PORTS = { postgres: 5432, valkey: 6379, mailpit: 8025 };

/** Problems with the dev overlay: Postgres, Valkey and Mailpit published, on the loopback interface only. */
export const localDevServiceProblems = (services) => {
  const problems = [];
  for (const [name, target] of Object.entries(LOCAL_DEV_PORTS)) {
    if (!services[name]) {
      problems.push(`the local stack has no ${name} service`);
      continue;
    }
    const published = (services[name].ports ?? []).filter((port) => Number(port.target) === target);
    if (published.length === 0) problems.push(`the local stack does not publish ${name}'s port ${target}`);
    for (const port of published) {
      if (port.host_ip !== "127.0.0.1") problems.push(`${name} is published on ${port.host_ip ?? "every interface"}, not 127.0.0.1`);
    }
  }
  return problems;
};

/** The edge's container-side port for Keycloak's admin console (edge/nginx.conf). */
export const ADMIN_TARGET = 8083;

const publishesAdmin = (services) => (services.edge?.ports ?? []).filter((port) => Number(port.target) === ADMIN_TARGET);

/** Problems with the deployable definition: it publishes no admin port. */
export const deployableAdminProblems = (services) =>
  publishesAdmin(services).length > 0
    ? [`the edge publishes Keycloak's admin port ${ADMIN_TARGET}, which only the dev overlay may`]
    : [];

/** Problems with the local stack's admin port: published, on the loopback interface only, and named by Keycloak. */
export const localAdminProblems = (services) => {
  const published = publishesAdmin(services);
  const problems = [];
  if (published.length === 0) problems.push("the local stack's edge does not publish Keycloak's admin port");
  for (const port of published) {
    if (port.host_ip !== "127.0.0.1") problems.push(`the admin port is published on ${port.host_ip ?? "every interface"}, not 127.0.0.1`);
    if (services.keycloak?.environment?.KC_HOSTNAME_ADMIN !== `http://localhost:${port.published}`) {
      problems.push("KC_HOSTNAME_ADMIN does not name the published admin port");
    }
  }
  return problems;
};

/** The realm every issuer names (keycloak/realm-export.json). */
const ISSUER_PATH = "/realms/kalia";

/** The edge's container-side ports, which the host ports it publishes map from (edge/nginx.conf). */
const EDGE_TARGETS = { web: 3000, backend: 8080, keycloak: 8081 };

const publishedAs = (services, target) => (services.edge?.ports ?? []).find((port) => Number(port.target) === target)?.published;

/**
 * Problems with who validates the issuer Keycloak stamps (ADR-0097): the
 * hostname Keycloak is configured with, the issuer the backend and the web
 * app validate, and the web app's public URL as the realm sees it must be
 * one origin each. A mismatch presents as a broken sign-in, not as a
 * configuration error, so it is asserted on the rendered configuration.
 */
export const issuerProblems = (services) => {
  const stamped = services.keycloak?.environment?.KC_HOSTNAME;
  const problems = [];
  if (!stamped) problems.push("keycloak is not given KC_HOSTNAME, so it stamps an issuer derived from each request");
  for (const [who, issuer] of [
    ["the backend", services.backend?.environment?.KEYCLOAK_ISSUER_URI],
    ["the web app", services.web?.environment?.AUTH_KEYCLOAK_ISSUER],
  ]) {
    if (stamped && issuer !== `${stamped}${ISSUER_PATH}`) {
      problems.push(`${who} validates an issuer other than the one Keycloak stamps from KC_HOSTNAME`);
    }
  }
  const publicUrl = services.web?.environment?.AUTH_URL;
  const realmUrl = services["keycloak-config"]?.environment?.WEB_URL;
  if (!publicUrl || publicUrl !== realmUrl) {
    problems.push("the web app's AUTH_URL differs from the WEB_URL the realm is built from");
  }
  return problems;
};

/**
 * Problems with the addresses that name the stack, for one host: each is that
 * host with the edge's own published port for the service, so a worktree's
 * ports are what is expected and never an assumed default. The host is
 * `localhost` with phone mode off and the tailnet name with it on.
 */
export const addressProblems = (services, host) => {
  const web = publishedAs(services, EDGE_TARGETS.web);
  const keycloak = publishedAs(services, EDGE_TARGETS.keycloak);
  if (!web || !keycloak) return ["the edge does not publish the web app's and Keycloak's ports, so no address can be checked"];
  const expected = {
    "keycloak KC_HOSTNAME": [services.keycloak?.environment?.KC_HOSTNAME, `http://${host}:${keycloak}`],
    "the backend's KEYCLOAK_ISSUER_URI": [services.backend?.environment?.KEYCLOAK_ISSUER_URI, `http://${host}:${keycloak}${ISSUER_PATH}`],
    "the web app's AUTH_KEYCLOAK_ISSUER": [services.web?.environment?.AUTH_KEYCLOAK_ISSUER, `http://${host}:${keycloak}${ISSUER_PATH}`],
    "the web app's AUTH_URL": [services.web?.environment?.AUTH_URL, `http://${host}:${web}`],
    "the realm's WEB_URL": [services["keycloak-config"]?.environment?.WEB_URL, `http://${host}:${web}`],
  };
  return Object.entries(expected)
    .filter(([, [actual, want]]) => actual !== want)
    .map(([what, [, want]]) => `${what} is not ${want}`);
};

/** Problems with who can reach the host's published ports: only the loopback interface, in both modes. */
export const loopbackProblems = (services) =>
  Object.entries(services).flatMap(([name, definition]) =>
    (definition.ports ?? [])
      .filter((port) => port.host_ip !== "127.0.0.1")
      .map((port) => `${name} publishes port ${port.published} on ${port.host_ip ?? "every interface"}, beyond 127.0.0.1`),
  );

// A clean environment: nothing from the caller's shell or root .env may fill
// in a variable the check means to leave unset.
const compose = (args, extraEnv) =>
  execFileSync("docker", ["compose", ...args], {
    cwd: ROOT,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...extraEnv },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const renderFails = (args, env) => {
  try {
    compose(args, env);
    return undefined;
  } catch (error) {
    return String(error.stderr ?? error.message);
  }
};

const run = () => {
  const baseText = readFileSync(join(ROOT, "docker-compose.base.yml"), "utf8");
  const devEnvText = readFileSync(join(ROOT, "docker-compose.dev.env"), "utf8");
  const problems = consistencyProblems({ baseText, devEnvText });
  const baseArgs = ["--env-file", "/dev/null", "-f", "docker-compose.base.yml", "config", "--format", "json"];

  const required = requiredVariables(baseText);
  const everySecret = Object.fromEntries(required.map((name) => [name, "check-compose-value"]));

  for (const name of required) {
    const { [name]: _left, ...others } = everySecret;
    const stderr = renderFails(baseArgs, others);
    if (stderr === undefined) problems.push(`the base file renders without ${name}`);
    else if (!new RegExp(`\\b${name}\\b`).test(stderr)) problems.push(`the base file refuses without ${name} but does not name it: ${stderr.trim()}`);
  }

  const base = JSON.parse(compose(baseArgs, everySecret));
  if ("keycloak-seed" in base.services) problems.push("the base file defines keycloak-seed, a dev-only service");
  if (JSON.stringify(base).includes("kalia-swagger")) problems.push("the base file mentions the kalia-swagger client");

  problems.push(...deployableSeedProblems({ baseText, services: base.services }));
  problems.push(...edgeProblems(base.services), ...deployableAdminProblems(base.services), ...devOnlyProblems(base.services), ...roleProblems(base.services));

  const scanEnv = { PATH: process.env.PATH, HOME: process.env.HOME, ...everySecret };
  const scanArgs = ["--env-file", "/dev/null", "-f", "docker-compose.base.yml"];
  const matrix = renderMatrix(scanArgs, scanEnv);
  for (const [name, definition] of Object.entries(base.services)) {
    const entry = matrix.find((candidate) => (definition.image ? candidate.image === definition.image : candidate.service === name));
    if (!entry) problems.push(`the vulnerability scan's matrix omits ${name}, which the base file runs`);
  }

  const dir = mkdtempSync(join(tmpdir(), "check-compose-"));
  try {
    const canary = "example.invalid/scan-canary:1.0";
    const added = join(dir, "added.yml");
    writeFileSync(added, `services:\n  scan-canary:\n    image: ${canary}\n`);
    if (!renderMatrix([...scanArgs, "-f", added], scanEnv).some((entry) => entry.image === canary)) {
      problems.push("an image added to the base file is not in the vulnerability scan's matrix");
    }

    // What a developer's root .env holds: the one value with no dev default.
    const rootEnv = join(dir, ".env");
    writeFileSync(rootEnv, "KALIA_WEB_CLIENT_SECRET=check-compose-value\n");
    const local = JSON.parse(compose(["--env-file", rootEnv, "config", "--format", "json"], {}));
    const seed = local.services["keycloak-seed"];
    const keycloak = local.services.keycloak.environment;
    problems.push(...localSeedProblems(seed, devEnvText));
    if (seed) {
      if (seed.environment.KEYCLOAK_ADMIN !== keycloak.KC_BOOTSTRAP_ADMIN_USERNAME) {
        problems.push("keycloak-seed's KEYCLOAK_ADMIN differs from the admin Keycloak starts with");
      }
      if (seed.environment.KEYCLOAK_ADMIN_PASSWORD !== keycloak.KC_BOOTSTRAP_ADMIN_PASSWORD) {
        problems.push("keycloak-seed's KEYCLOAK_ADMIN_PASSWORD differs from the admin password Keycloak starts with");
      }
    }
    problems.push(...localAdminProblems(local.services), ...localDevServiceProblems(local.services));
    problems.push(...issuerProblems(local.services), ...addressProblems(local.services, "localhost"), ...loopbackProblems(local.services));

    // Phone mode (ADR-0097): the same stack with the one value set.
    const phoneHost = "check-compose.example.ts.net";
    const phoneEnv = join(dir, "phone.env");
    writeFileSync(phoneEnv, `KALIA_WEB_CLIENT_SECRET=check-compose-value\nKALIA_PHONE_HOST=${phoneHost}\n`);
    const phone = JSON.parse(compose(["--env-file", phoneEnv, "config", "--format", "json"], {}));
    problems.push(
      ...issuerProblems(phone.services).map((problem) => `phone mode: ${problem}`),
      ...addressProblems(phone.services, phoneHost).map((problem) => `phone mode: ${problem}`),
      ...loopbackProblems(phone.services).map((problem) => `phone mode: ${problem}`),
    );
    if (seed && seed.environment.KEYCLOAK_ADMIN_PUBLIC_URL !== keycloak.KC_HOSTNAME_ADMIN) {
      problems.push("keycloak-seed's KEYCLOAK_ADMIN_PUBLIC_URL differs from the KC_HOSTNAME_ADMIN Keycloak starts with");
    }
    if (local.services.web.environment.KALIA_DEV_STACK !== "true") {
      problems.push("the local stack does not mark the web app as the dev stack");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  if (problems.length > 0) {
    console.error(`compose definition checks failed (${problems.length}):`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`docker-compose.base.yml refuses without each of its ${required.length} required variables and carries nothing dev-only`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) run();

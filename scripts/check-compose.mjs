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

/** Problems with how the dev env file and the base file line up. */
export const consistencyProblems = ({ baseText, devEnvText }) => {
  const required = new Set(requiredVariables(baseText));
  const defaulted = new Set(variablesWithDefault(baseText));
  const problems = [];
  for (const name of variablesSupplied(devEnvText)) {
    if (defaulted.has(name)) {
      problems.push(`docker-compose.base.yml gives ${name} a \`:-\` default, which docker-compose.dev.env already supplies`);
    }
    if (!baseText.includes("${" + name)) {
      problems.push(`docker-compose.dev.env supplies ${name}, which docker-compose.base.yml does not use`);
    }
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

  problems.push(...edgeProblems(base.services), ...deployableAdminProblems(base.services));

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
    if (!seed) problems.push("the local stack has no keycloak-seed service");
    else {
      if (seed.environment.KEYCLOAK_ADMIN !== keycloak.KC_BOOTSTRAP_ADMIN_USERNAME) {
        problems.push("keycloak-seed's KEYCLOAK_ADMIN differs from the admin Keycloak starts with");
      }
      if (seed.environment.KEYCLOAK_ADMIN_PASSWORD !== keycloak.KC_BOOTSTRAP_ADMIN_PASSWORD) {
        problems.push("keycloak-seed's KEYCLOAK_ADMIN_PASSWORD differs from the admin password Keycloak starts with");
      }
    }
    problems.push(...localAdminProblems(local.services));
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

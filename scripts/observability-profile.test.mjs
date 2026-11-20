#!/usr/bin/env node
// The observability profile (ADR-0114) must cost the default stack nothing:
// without it Compose renders the containers it rendered before the profile
// existed, and the deployable definition never names the profile's services.
// Renders the compose files, which needs the docker CLI but no daemon. Runs in
// `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PORT_DEFAULTS } from "./stack-ports.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** The local stack's services before the profile existed. Change it only with the stack. */
const DEFAULT_SERVICES = ["backend", "edge", "keycloak", "keycloak-config", "keycloak-seed", "mailpit", "postgres", "valkey", "web"];

/** What the profile adds, each defined in docker-compose.override.yml. */
const PROFILE_SERVICES = ["alloy", "lgtm", "postgres-exporter", "postgres-monitor-role", "redis-exporter"];

/** The exporters among them: each reads a service that has no metrics of its own, and none runs without the profile. */
const EXPORTERS = ["postgres-exporter", "redis-exporter"];

const withRootEnv = (extra, run) => {
  const dir = mkdtempSync(join(tmpdir(), "observability-profile-"));
  try {
    const envFile = join(dir, ".env");
    writeFileSync(envFile, `KALIA_WEB_CLIENT_SECRET=observability-profile-test\n${extra}`);
    return run(envFile);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// A clean environment, so nothing in the caller's shell or root .env decides what renders.
const render = (args, env = {}) =>
  JSON.parse(
    execFileSync("docker", ["compose", ...args, "config", "--format", "json"], {
      cwd: ROOT,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );

const renderLocal = ({ profile = false, extraEnv = "" } = {}) =>
  withRootEnv(extraEnv, (envFile) => render(["--env-file", envFile, ...(profile ? ["--profile", "observability"] : [])]));

const names = (config) => Object.keys(config.services).sort();

test("the default stack renders the containers it rendered before the profile", () => {
  assert.deepEqual(names(renderLocal()), DEFAULT_SERVICES);
});

test("the profile adds its own services and nothing else", () => {
  const added = names(renderLocal({ profile: true })).filter((name) => !DEFAULT_SERVICES.includes(name));
  assert.deepEqual(added, PROFILE_SERVICES);
});

test("each of the profile's services is in the profile and nothing else is", () => {
  const services = renderLocal({ profile: true }).services;
  for (const name of PROFILE_SERVICES) assert.deepEqual(services[name].profiles, ["observability"], name);
  for (const name of DEFAULT_SERVICES) assert.equal(services[name].profiles, undefined, `${name} is in a profile`);
});

test("the deployable definition names none of the profile's services, and its profile adds none", () => {
  const baseText = readFileSync(join(ROOT, "docker-compose.base.yml"), "utf8");
  for (const name of [...PROFILE_SERVICES, "observability"]) {
    assert.doesNotMatch(baseText, new RegExp(`\\b${name}\\b`), `docker-compose.base.yml mentions ${name}`);
  }
  const base = render(["--env-file", "docker-compose.dev.env", "--profile", "observability", "-f", "docker-compose.base.yml"], {
    KALIA_WEB_CLIENT_SECRET: "observability-profile-test",
  });
  for (const name of PROFILE_SERVICES) assert.ok(!(name in base.services), `the deployable definition runs ${name}`);
});

test("the viewer's port is read from the environment and bound to the loopback interface", () => {
  const grafana = (config) => config.services.lgtm.ports.filter((port) => Number(port.target) === 3000);
  const [byDefault] = grafana(renderLocal({ profile: true }));
  assert.equal(byDefault.published, String(PORT_DEFAULTS.GRAFANA_PORT));
  assert.equal(byDefault.host_ip, "127.0.0.1");
  const [own] = grafana(renderLocal({ profile: true, extraEnv: "GRAFANA_PORT=3999\n" }));
  assert.equal(own.published, "3999");
  const published = renderLocal({ profile: true }).services.lgtm.ports;
  assert.equal(published.length, 1, "only Grafana is published; the collector is reached on the stack's network");
});

test("the image is pinned to a version and the store has a volume and a memory limit", () => {
  const { lgtm, alloy, ...others } = renderLocal({ profile: true }).services;
  const images = PROFILE_SERVICES.map((name) => (name === "lgtm" ? lgtm : name === "alloy" ? alloy : others[name]).image);
  for (const image of images) assert.match(image, /:v?\d+\.\d+(\.\d+)?$/, `${image} is not pinned`);
  assert.ok(lgtm.volumes.some((volume) => volume.target === "/data" && volume.type === "volume"), "/data is not a named volume");
  assert.equal(Number(lgtm.mem_limit), 2 * 1024 ** 3);
});

test("an exporter runs only with the profile, and is the community image CI can pull", () => {
  const without = renderLocal();
  const withProfile = renderLocal({ profile: true });
  for (const name of EXPORTERS) {
    assert.ok(!(name in without.services), `${name} runs without the profile`);
    assert.deepEqual(withProfile.services[name].profiles, ["observability"], name);
    assert.doesNotMatch(withProfile.services[name].image, /^dhi\.io\//, `${name} is a dhi.io image, which the scan job's runner cannot pull`);
  }
});

test("neither exporter publishes a port: Prometheus reaches it on the stack's network", () => {
  const { services } = renderLocal({ profile: true });
  for (const name of EXPORTERS) assert.equal(services[name].ports, undefined, `${name} publishes a port`);
});

test("the exporter's role belongs to the profile: neither the base file nor the init script creates it", () => {
  const baseText = readFileSync(join(ROOT, "docker-compose.base.yml"), "utf8");
  const initText = readFileSync(join(ROOT, "postgres/init/01-create-roles-and-databases.sql"), "utf8");
  for (const [where, text] of [["docker-compose.base.yml", baseText], ["postgres/init", initText]]) {
    assert.doesNotMatch(text, /kalia_monitor|pg_monitor|KALIA_MONITOR/, `${where} has the exporter's role`);
  }
  const { services } = renderLocal({ profile: true });
  assert.equal(services["postgres-exporter"].environment.DATA_SOURCE_USER, "kalia_monitor");
  assert.notEqual(services["postgres-exporter"].environment.DATA_SOURCE_USER, services.postgres.environment.POSTGRES_USER);
});

test("the exporter's role is granted pg_monitor and a connection to the database it reads, and nothing on a table", () => {
  const sql = readFileSync(join(ROOT, "observability/monitor-role.sql"), "utf8");
  assert.match(sql, /GRANT pg_monitor TO kalia_monitor;/);
  assert.match(sql, /GRANT CONNECT ON DATABASE kalia TO kalia_monitor;/);
  assert.doesNotMatch(sql, /SUPERUSER|CREATEROLE|CREATEDB|ON (ALL )?TABLES|GRANT (SELECT|INSERT|UPDATE|DELETE|ALL)/i);
});

test("the Keycloak image counts its requests only in the local stack", () => {
  const dockerfile = readFileSync(join(ROOT, "keycloak/Dockerfile"), "utf8");
  assert.match(dockerfile, /ARG KC_METRICS_ENABLED=false/);
  const args = (config) => config.services.keycloak.build.args ?? {};
  assert.equal(args(renderLocal()).KC_METRICS_ENABLED, "true");
  const base = render(["--env-file", "docker-compose.dev.env", "-f", "docker-compose.base.yml"], {
    KALIA_WEB_CLIENT_SECRET: "observability-profile-test",
  });
  assert.equal(args(base).KC_METRICS_ENABLED, undefined, "the deployable definition builds Keycloak with counters");
});

// "Nothing leaves the machine" (DW-4) is a promise about every container the
// profile runs, and the images report usage and ask their makers about updates
// unless told not to. Each assertion reads the rendered profile, so a flag
// dropped from the file or renamed by an upgrade fails here and not in a
// network trace.
test("Alloy is told not to report the components it runs to Grafana", () => {
  const { command } = renderLocal({ profile: true }).services.alloy;
  assert.ok(command.includes("--disable-reporting"), "alloy is started without --disable-reporting");
  assert.equal(command[0], "run", "the flag belongs to `alloy run`, after the subcommand");
});

test("Grafana reports no usage and checks for no update or plugin update", () => {
  const { environment } = renderLocal({ profile: true }).services.lgtm;
  for (const name of ["GF_ANALYTICS_REPORTING_ENABLED", "GF_ANALYTICS_CHECK_FOR_UPDATES", "GF_ANALYTICS_CHECK_FOR_PLUGIN_UPDATES"]) {
    assert.equal(environment[name], "false", `${name} is not "false"`);
  }
});

test("Loki, Tempo and Pyroscope report no usage", () => {
  const { environment } = renderLocal({ profile: true }).services.lgtm;
  const args = (name) => (environment[name] ?? "").split(/\s+/);
  assert.ok(args("LOKI_EXTRA_ARGS").includes("-reporting.enabled=false"), "Loki's usage report is on");
  assert.ok(args("TEMPO_EXTRA_ARGS").includes("-reporting.enabled=false"), "Tempo's usage report is on");
  assert.ok(args("PYROSCOPE_EXTRA_ARGS").includes("-usage-stats.enabled=false"), "Pyroscope's usage report is on");
});

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
const PROFILE_SERVICES = ["alloy", "lgtm"];

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
  const { lgtm, alloy } = renderLocal({ profile: true }).services;
  for (const image of [lgtm.image, alloy.image]) assert.match(image, /:v?\d+\.\d+\.\d+$/, `${image} is not pinned`);
  assert.ok(lgtm.volumes.some((volume) => volume.target === "/data" && volume.type === "volume"), "/data is not a named volume");
  assert.equal(Number(lgtm.mem_limit), 2 * 1024 ** 3);
});
